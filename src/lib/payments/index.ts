import "server-only";

import type { PaymentMode } from "@/lib/types";
import { ifthenpayPaymentProvider } from "./ifthenpay";
import { manualPaymentProvider } from "./manual";
import type { PaymentProvider } from "./types";

export type { PaymentInitiation, PaymentProvider, WebhookResult } from "./types";
export { manualPaymentProvider } from "./manual";

function isIfthenpayConfigured(): boolean {
  return Boolean(
    process.env.IFTHENPAY_API_KEY?.trim() &&
      process.env.IFTHENPAY_WEBHOOK_SECRET?.trim(),
  );
}

/**
 * Escolhe o fornecedor de pagamento: Ifthenpay quando o painel está em modo
 * automático **e** as variáveis estão preenchidas; caso contrário, manual.
 * Assim um site sem chaves nunca deixa de aceitar pedidos.
 */
export function getPaymentProvider(mode: PaymentMode): PaymentProvider {
  if (mode === "mbway_api") {
    if (isIfthenpayConfigured()) return ifthenpayPaymentProvider;
    console.warn(
      "[comfe] payment_mode = mbway_api mas IFTHENPAY_API_KEY / IFTHENPAY_WEBHOOK_SECRET vazios — a usar modo manual.",
    );
  }
  return manualPaymentProvider;
}

/**
 * O webhook é sempre tratado pelo Ifthenpay (quando configurado), mesmo que
 * o painel esteja em modo manual — um pagamento pode ter sido iniciado antes
 * de a configuração mudar.
 */
export function getWebhookProvider(): PaymentProvider {
  return isIfthenpayConfigured() ? ifthenpayPaymentProvider : manualPaymentProvider;
}
