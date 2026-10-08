"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSessionClient, requireAdmin } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const WORKER_STATUSES: OrderStatus[] = [
  "new",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

/** Transição do estado de um pedido pelo cozinheiro. */
export async function setOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) redirect("/admin/login");
  if (!WORKER_STATUSES.includes(status)) {
    return { ok: false, error: "Estado inválido." };
  }

  const supabase = await createSessionClient();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Confirmação manual do pagamento (modo manual).
 * Idempotente: pedidos já pagos não são alterados.
 */
export async function confirmManualPaymentAdmin(
  orderId: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) redirect("/admin/login");

  const supabase = await createSessionClient();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const { data: order, error: readError } = await supabase
    .from("orders")
    .select("payment_status, status")
    .eq("id", orderId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };
  if (!order) return { ok: false, error: "Pedido não encontrado." };
  if (order.payment_status === "paid") return { ok: true };
  if (order.status === "cancelled" || order.status === "completed") {
    return { ok: false, error: "O pedido já está num estado final." };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      status: "new",
    })
    .eq("id", orderId)
    .neq("payment_status", "paid");

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function cancelOrderAdmin(orderId: string): Promise<ActionResult> {
  return setOrderStatus(orderId, "cancelled");
}

/** Termina a sessão e volta ao login. */
export async function signOutAdmin() {
  const supabase = await createSessionClient();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/admin/login");
}