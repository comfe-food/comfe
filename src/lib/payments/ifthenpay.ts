import "server-only";

import { markOrderAsPaidByNumber } from "@/lib/data/order-payment";
import { safeEquals } from "@/lib/business/rate-limit";
import type {
  OrderPaymentContext,
  PaymentInitiation,
  PaymentProvider,
  WebhookResult,
} from "./types";

/**
 * Integração Ifthenpay (MB WAY REST API v2).
 *
 * Docs: https://ifthenpay.com/docs/en/api/mbway/openapi.yaml
 *   POST https://api.ifthenpay.com/spg/payment/mbway      → pedido de pagamento
 *   GET  https://api.ifthenpay.com/spg/payment/mbway/status → estado (000 = pago)
 *
 * Webhook (callback) chega por GET com query string:
 *   ?key=ANTI_PHISHING_KEY&orderId=…&amount=…&requestId=…&payment_datetime=…
 * O `key` é comparado em tempo constante com IFTHENPAY_WEBHOOK_SECRET e o
 * valor é confirmado contra a API antes de marcar o pedido como pago.
 */

const API_BASE =
  process.env.IFTHENPAY_API_URL?.replace(/\/$/, "") ??
  "https://api.ifthenpay.com/spg/payment";

/** Códigos de estado da API (ver OpenAPI: enum Status). */
const PAID = "000";

function env() {
  return {
    mbWayKey: process.env.IFTHENPAY_API_KEY?.trim() || null,
    webhookSecret: process.env.IFTHENPAY_WEBHOOK_SECRET?.trim() || null,
  };
}

function formatMobile(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `351#${digits}`;
}

function formatAmount(total: number): string {
  return total.toFixed(2);
}

/** `orderId` do callback → uuid interno (máx. 15 caracteres). */
function parseOrderNumber(value: string): number | null {
  if (!/^\d{1,15}$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

async function requestPayment(
  key: string,
  order: OrderPaymentContext,
): Promise<{ requestId: string | null; message: string; ok: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${API_BASE}/mbway`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        mbWayKey: key,
        // orderId é o número do pedido (curto, único e legível no backoffice)
        orderId: String(order.orderNumber),
        amount: formatAmount(order.total),
        mobileNumber: formatMobile(order.customerPhone),
        description: order.description.slice(0, 100),
      }),
    });

    if (!res.ok) {
      return { requestId: null, message: `Ifthenpay HTTP ${res.status}`, ok: false };
    }

    const data = (await res.json()) as {
      Status?: string;
      Message?: string;
      RequestId?: string;
    };

    if (data.Status === PAID && data.RequestId) {
      return { requestId: data.RequestId, message: "Pedido criado", ok: true };
    }
    return {
      requestId: null,
      message: data.Message || `Ifthenpay status ${data.Status ?? "?"}`,
      ok: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro de rede";
    return { requestId: null, message: `Ifthenpay indisponível: ${message}`, ok: false };
  } finally {
    clearTimeout(timer);
  }
}

/** Confirma na API se a transação realmente está paga (000). */
async function fetchPaidStatus(
  key: string,
  requestId: string,
): Promise<"paid" | "not_paid" | "error"> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const url = new URL(`${API_BASE}/mbway/status`);
    url.searchParams.set("mbWayKey", key);
    url.searchParams.set("requestId", requestId);

    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!res.ok) return "error";

    const data = (await res.json()) as { Status?: string };
    if (data.Status === PAID) return "paid";
    return "not_paid";
  } catch {
    return "error";
  } finally {
    clearTimeout(timer);
  }
}

export const ifthenpayPaymentProvider: PaymentProvider = {
  id: "ifthenpay",

  async createMbWayPayment(
    order: OrderPaymentContext,
  ): Promise<PaymentInitiation> {
    const { mbWayKey } = env();
    if (!mbWayKey) {
      return {
        status: "failed",
        reference: null,
        message: "Pagamento automático não configurado (IFTHENPAY_API_KEY).",
      };
    }

    const result = await requestPayment(mbWayKey, order);
    if (!result.ok) {
      return { status: "failed", reference: null, message: result.message };
    }
    return {
      status: "pending",
      reference: result.requestId,
      message: "Confirma o pagamento na app MB WAY (telemóvel).",
    };
  },

  async handleWebhook(req: Request): Promise<WebhookResult> {
    const { mbWayKey, webhookSecret } = env();
    if (!mbWayKey || !webhookSecret) {
      return { handled: false, paid: false, reason: "not_configured" };
    }

    const params = new URL(req.url).searchParams;
    const key = params.get("key") ?? "";
    const orderIdParam = params.get("orderId") ?? "";
    const amountParam = params.get("amount") ?? "";
    const requestId = params.get("requestId") ?? "";
    const paymentDatetime = params.get("payment_datetime") ?? "";

    // 1. Autenticidade (tempo constante)
    if (!key || !safeEquals(key, webhookSecret)) {
      return { handled: false, paid: false, reason: "invalid_key" };
    }

    // 2. Identificação do pedido
    const orderNumber = parseOrderNumber(orderIdParam);
    if (!orderNumber) {
      return { handled: false, paid: false, reason: "invalid_order_id" };
    }

    // 3. Valor esperado
    const expectedTotal = Number(amountParam.replace(",", "."));
    if (!Number.isFinite(expectedTotal) || expectedTotal <= 0) {
      return { handled: false, paid: false, reason: "invalid_amount" };
    }

    // 4. Confirmação na API (defesa em profundidade contra callbacks falsos)
    if (requestId) {
      const status = await fetchPaidStatus(mbWayKey, requestId);
      if (status === "error") {
        return { handled: false, paid: false, reason: "status_unavailable" };
      }
      if (status === "not_paid") {
        return { handled: false, paid: false, reason: "not_paid_yet" };
      }
    }

    const result = await markOrderAsPaidByNumber(orderNumber, {
      reference: requestId || null,
      expectedTotal,
      paidAt: paymentDatetime,
    });

    return {
      handled: true,
      paid: result.ok,
      reason: result.ok ? "paid" : result.reason,
    };
  },
};
