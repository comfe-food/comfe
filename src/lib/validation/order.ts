import { z } from "zod";

export const MAX_ITEM_NOTES = 140;
export const MAX_ORDER_NOTES = 500;
export const MAX_NAME = 80;
export const MAX_QUANTITY = 20;
export const MAX_ITEMS_PER_ORDER = 30;

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^9\d{8}$/, "Telefone inválido");

export const orderItemInputSchema = z.object({
  dishId: z.uuid(),
  optionIds: z.array(z.uuid()).max(20).default([]),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
  notes: z.string().trim().max(MAX_ITEM_NOTES).default(""),
});

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, "Indica o teu nome").max(MAX_NAME),
  customerPhone: phoneSchema,
  pickupTime: z.string().datetime({ offset: true }).nullish(),
  notes: z.string().trim().max(MAX_ORDER_NOTES).default(""),
  items: z.array(orderItemInputSchema).min(1).max(MAX_ITEMS_PER_ORDER),
  /** Honeypot: tem de ficar vazio. */
  website: z.string().max(0).optional().default(""),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
