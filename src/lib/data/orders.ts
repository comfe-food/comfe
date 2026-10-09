import "server-only";

import type { OrderStatus, PaymentStatus } from "@/lib/types";
import type { CreateOrderInput } from "@/lib/validation/order";
import {
  assertOrderRateLimit,
  hashIp,
  RateLimitError,
} from "@/lib/business/rate-limit";
import { priceOrder, PricingError } from "@/lib/business/pricing";
import { getOpenState, validatePickupTime } from "@/lib/business/hours";
import { getServerSettings } from "@/lib/data/site";
import { requireServiceClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import type { PaymentInitiation } from "@/lib/payments/types";

export { RateLimitError, PricingError };

export class OrderClosedError extends Error {
  constructor(message = "Neste momento não estamos a aceitar pedidos.") {
    super(message);
    this.name = "OrderClosedError";
  }
}

export class PickupTimeError extends Error {
  constructor() {
    super("A hora de recolha escolhida não está disponível.");
    this.name = "PickupTimeError";
  }
}

export interface CreateOrderResult {
  token: string;
  orderNumber: number;
  status: OrderStatus;
  payment: PaymentInitiation;
}

/**
 * Cria um pedido: valida horário, recalcula preços no servidor, limita a
 * frequência e inicia o pagamento MB WAY.
 */
export async function createOrder(
  input: CreateOrderInput,
  context: { ip: string },
): Promise<CreateOrderResult> {
  const supabase = requireServiceClient();
  const settings = await getServerSettings();

  const openState = getOpenState(settings);
  if (!openState.isOpen) throw new OrderClosedError();

  const ipHash = hashIp(context.ip);

  await assertOrderRateLimit(supabase, {
    ipHash,
    phone: input.customerPhone,
  });

  const priced = await priceOrder(supabase, input.items);

  let pickupTime: string | null = null;
  if (input.pickupTime) {
    pickupTime = validatePickupTime(input.pickupTime, settings);
    if (!pickupTime) throw new PickupTimeError();
  }

  const provider = getPaymentProvider(settings.payment_mode);
  const automated = provider.id === "ifthenpay";

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      pickup_time: pickupTime,
      notes: input.notes || null,
      subtotal: String(priced.subtotal),
      total: String(priced.total),
      status: automated ? "pending_payment" : "new",
      payment_status: "pending",
      payment_method: "mbway",
      ip_hash: ipHash,
    })
    .select("id, public_token, order_number, total")
    .single();

  if (orderError || !order) {
    throw new Error(`Não foi possível criar o pedido: ${orderError?.message}`);
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    priced.items.map((item) => ({
      order_id: order.id,
      dish_id: item.dish_id,
      dish_name: item.dish_name,
      unit_price: String(item.unit_price),
      quantity: item.quantity,
      selected_options: item.selected_options.map((o) => ({
        group: o.group_name,
        option: o.option_name,
        extra_price: o.extra_price,
      })),
      item_notes: item.item_notes || null,
      line_total: String(item.line_total),
    })),
  );

  if (itemsError) {
    // Não deixa pedidos sem itens
    await supabase.from("orders").delete().eq("id", order.id);
    throw new Error(`Não foi possível guardar os itens: ${itemsError.message}`);
  }

  const payment = await provider.createMbWayPayment({
    orderId: order.id,
    orderNumber: order.order_number,
    total: priced.total,
    customerPhone: input.customerPhone,
    customerName: input.customerName,
    description: `Comfe pedido ${order.order_number}`,
  });

  if (payment.reference) {
    await supabase
      .from("orders")
      .update({ payment_reference: payment.reference })
      .eq("id", order.id);
  }

  if (payment.status === "failed") {
    // Não cancela: o pedido fica pendente e a página de confirmação mostra as
    // instruções de pagamento manual, para o cliente não perder o carrinho.
    await supabase
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", order.id);
  }

  return {
    token: order.public_token,
    orderNumber: order.order_number,
    status: automated ? "pending_payment" : "new",
    payment,
  };
}

export interface PublicOrderItem {
  id: string;
  dish_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  item_notes: string | null;
  selected_options: { group: string; option: string; extra_price?: number | string }[];
}

export interface PublicOrderView {
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMode: "manual" | "mbway_api";
  total: string;
  pickupTime: string | null;
  notes: string | null;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  mbwayPayee: string | null;
  items: PublicOrderItem[];
}

const TOKEN_RE = /^[a-f0-9]{24}$/;

/** Consulta pública de um pedido pelo `public_token` (24 caracteres hex). */
export async function getPublicOrderByToken(
  token: string,
): Promise<PublicOrderView | null> {
  if (!TOKEN_RE.test(token)) return null;

  const supabase = requireServiceClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    console.error("[comfe] Erro ao ler pedido:", error.message);
    return null;
  }
  if (!order) return null;

  const [{ data: items }, settings] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", order.id),
    getServerSettings(),
  ]);

  return {
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    paymentMode: settings.payment_mode === "mbway_api" ? "mbway_api" : "manual",
    total: String(order.total),
    pickupTime: order.pickup_time,
    notes: order.notes,
    createdAt: order.created_at,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    mbwayPayee: settings.mbway_payee || settings.phone,
    items: (items ?? []).map((i) => ({
      id: i.id,
      dish_name: i.dish_name,
      quantity: i.quantity,
      unit_price: String(i.unit_price),
      line_total: String(i.line_total),
      item_notes: i.item_notes,
      selected_options: Array.isArray(i.selected_options)
        ? (i.selected_options as PublicOrderItem["selected_options"])
        : [],
    })),
  };
}
