import "server-only";

import { requireServiceClient } from "@/lib/supabase/admin";

/**
 * Escrita de estado de pagamento dos pedidos.
 * Está num módulo próprio (e não em `orders.ts`) para que a camada de
 * pagamentos possa usá-lo sem criar um ciclo de importações.
 */

/** `28-10-2021 10:55:21` (formato do callback Ifthenpay) → ISO, ou null. */
function parseCallbackDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, mi, ss] = m;
  const iso = new Date(
    `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+01:00`,
  ).toISOString();
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

export interface MarkPaidOptions {
  reference?: string | null;
  expectedTotal?: number;
  paidAt?: string | null;
}

async function markPaid(
  match: { id?: string; orderNumber?: number },
  options: MarkPaidOptions = {},
): Promise<{ ok: boolean; reason?: string }> {
  const supabase = requireServiceClient();

  let query = supabase.from("orders").select("id, total, status, payment_status, payment_reference");
  query = match.id
    ? query.eq("id", match.id)
    : query.eq("order_number", match.orderNumber!);

  const { data: order, error } = await query.maybeSingle();
  if (error) return { ok: false, reason: error.message };
  if (!order) return { ok: false, reason: "order_not_found" };

  // Idempotência: já pago (callback repetido) ou estado final
  if (order.payment_status === "paid") return { ok: true, reason: "already_paid" };
  if (order.status === "cancelled" || order.status === "completed") {
    return { ok: false, reason: "final_state" };
  }

  if (
    options.expectedTotal !== undefined &&
    Math.abs(Number(order.total) - options.expectedTotal) > 0.009
  ) {
    return { ok: false, reason: "amount_mismatch" };
  }

  const reference = options.reference ?? order.payment_reference ?? null;

  // `.neq("payment_status", "paid")` torna a escrita idempotente mesmo com
  // duas notificações a chegar ao mesmo tempo.
  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      payment_reference: reference,
      paid_at: parseCallbackDate(options.paidAt) ?? new Date().toISOString(),
      status: "new",
    })
    .eq("id", order.id)
    .neq("payment_status", "paid")
    .select("id");

  if (updateError) return { ok: false, reason: updateError.message };
  // Sem linha atualizada → outra notificação chegou primeiro
  if (!updated || updated.length === 0) return { ok: true, reason: "already_paid" };
  return { ok: true };
}

export function markOrderAsPaid(
  orderId: string,
  options: MarkPaidOptions = {},
): Promise<{ ok: boolean; reason?: string }> {
  return markPaid({ id: orderId }, options);
}

/** Usado pelo webhook Ifthenpay, que envia o `order_number` como orderId. */
export function markOrderAsPaidByNumber(
  orderNumber: number,
  options: MarkPaidOptions = {},
): Promise<{ ok: boolean; reason?: string }> {
  return markPaid({ orderNumber }, options);
}

/** Confirmar manualmente o pagamento (painel do cozinheiro). */
export function confirmManualPayment(
  orderId: string,
): Promise<{ ok: boolean; reason?: string }> {
  return markPaid({ id: orderId });
}
