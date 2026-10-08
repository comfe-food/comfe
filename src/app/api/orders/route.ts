import { type NextRequest } from "next/server";
import {
  getClientIp,
} from "@/lib/business/rate-limit";
import {
  createOrder,
  OrderClosedError,
  PickupTimeError,
  RateLimitError,
} from "@/lib/data/orders";
import { PricingError } from "@/lib/business/pricing";
import { createOrderSchema } from "@/lib/validation/order";

function json(status: number, body: Record<string, unknown>, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Corpo do pedido inválido." });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const field = first?.path.join(".");
    return json(400, {
      error: first?.message ?? "Dados inválidos.",
      field: field || undefined,
    });
  }

  // Honeypot: formulários preenchidos por bots são rejeitados em silêncio.
  if (parsed.data.website) {
    return json(400, { error: "Dados inválidos." });
  }

  try {
    const result = await createOrder(parsed.data, {
      ip: getClientIp(request.headers),
    });
    return json(201, {
      token: result.token,
      orderNumber: result.orderNumber,
      status: result.status,
      payment: {
        status: result.payment.status,
        message: result.payment.message,
        reference: result.payment.reference,
      },
    });
  } catch (error) {
    if (error instanceof OrderClosedError) {
      return json(409, { error: error.message });
    }
    if (error instanceof PickupTimeError) {
      return json(400, { error: error.message, field: "pickupTime" });
    }
    if (error instanceof RateLimitError) {
      return json(429, { error: error.message }, { "Retry-After": "600" });
    }
    if (error instanceof PricingError) {
      return json(400, { error: error.message });
    }
    console.error("[comfe] Erro ao criar pedido:", error);
    return json(500, { error: "Não foi possível registar o pedido. Tenta novamente." });
  }
}
