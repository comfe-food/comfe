import { getWebhookProvider } from "@/lib/payments";

/**
 * Webhook (callback) do Ifthenpay MB WAY — GET com query string:
 *   ?key=ANTI_PHISHING_KEY&orderId=…&amount=…&requestId=…&payment_datetime=…
 *
 * Códigos de resposta (política de reenvio do Ifthenpay):
 *   200 → sucesso (não reenviado)
 *   401 → chave inválida (suspeita de fraude; é registado e reenviado)
 *   400 → parâmetros inválidos (erro nosso irregular — registado e reenviado)
 *   503 → não foi possível confirmar na API (reenviado mais tarde)
 */
export async function GET(request: Request) {
  const provider = getWebhookProvider();
  const result = await provider.handleWebhook(request);

  if (!result.handled) {
    // Manual ou não configurado: não há nada a fazer, mas nunca falhar.
    return Response.json({ ok: true }, { status: 200 });
  }

  switch (result.reason) {
    case "invalid_key":
      console.error("[comfe] Webhook com chave inválida:", request.url);
      return Response.json({ error: "Invalid key" }, { status: 401 });
    case "invalid_order_id":
    case "invalid_amount":
      console.error("[comfe] Webhook malformado:", request.url);
      return Response.json({ error: result.reason }, { status: 400 });
    case "status_unavailable":
      return Response.json({ error: "Temporarily unavailable" }, { status: 503 });
    default:
      return Response.json({ ok: true }, { status: 200 });
  }
}

// Aceita POST também: alguns clientes/firewalls enviam callbacks como POST.
export async function POST(request: Request) {
  return GET(request);
}