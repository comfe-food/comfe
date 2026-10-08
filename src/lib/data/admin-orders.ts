import "server-only";

import { createSessionClient } from "@/lib/supabase/server";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

export interface AdminOrderItem {
  id: string;
  dishName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  itemNotes: string | null;
  options: { group: string; option: string; extra_price: number | string }[];
}

export interface AdminOrder {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: string;
  notes: string | null;
  pickupTime: string | null;
  createdAt: string;
  items: AdminOrderItem[];
}

const BOARD_STATUSES: OrderStatus[] = [
  "pending_payment",
  "new",
  "preparing",
  "ready",
];

/** Pedidos ativos do painel (pendentes de pagamento + em curso). */
export async function getAdminOrders(limit = 60): Promise<AdminOrder[]> {
  const supabase = await createSessionClient();
  if (!supabase) return [];

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_phone, status, payment_status, total, notes, pickup_time, created_at")
    .in("status", BOARD_STATUSES)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !orders || orders.length === 0) {
    if (error) console.error("[comfe] Erro a ler pedidos (admin):", error.message);
    return [];
  }

  const ids = orders.map((o) => o.id);
  const { data: items } = await supabase
    .from("order_items")
    .select("id, order_id, dish_name, quantity, unit_price, line_total, item_notes, selected_options")
    .in("order_id", ids);

  const itemsByOrder = new Map<string, AdminOrderItem[]>();
  for (const item of items ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push({
      id: item.id,
      dishName: item.dish_name,
      quantity: item.quantity,
      unitPrice: String(item.unit_price),
      lineTotal: String(item.line_total),
      itemNotes: item.item_notes,
      options: Array.isArray(item.selected_options)
        ? (item.selected_options as AdminOrderItem["options"])
        : [],
    });
    itemsByOrder.set(item.order_id, list);
  }

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    status: o.status,
    paymentStatus: o.payment_status,
    total: String(o.total),
    notes: o.notes,
    pickupTime: o.pickup_time,
    createdAt: o.created_at,
    items: itemsByOrder.get(o.id) ?? [],
  }));
}