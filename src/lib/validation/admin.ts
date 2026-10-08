import { z } from "zod";

export const MAX_STORY = 4000;
export const MAX_NOTES_FIELD = 300;

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM)");

const phoneSchema = z
  .string()
  .trim()
  .regex(/^9\d{8}$/, "Telefone inválido (9 dígitos, começa por 9)");

const whatsappSchema = z
  .string()
  .trim()
  .regex(/^\d{9,15}$/, "Número inválido para o link do WhatsApp");

const optionalUrl = z.union([
  z.url({ message: "Link inválido (inclui https://)" }),
  z.literal(""),
]);

const optionalDate = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  z.literal(""),
]);

/** Definições do site editáveis no painel (`site_settings`). */
export const saveSiteSettingsSchema = z.object({
  brand_name: z.string().trim().min(1, "Indica o nome").max(60),
  phone: phoneSchema,
  whatsapp_number: whatsappSchema,
  instagram_url: optionalUrl,
  pickup_only_notice: z.string().trim().max(160),
  hero_title: z.string().trim().min(1, "Indica o título").max(120),
  hero_subtitle: z.string().trim().max(200),
  story_title: z.string().trim().max(120),
  story_text: z.string().trim().max(MAX_STORY),
  banner_message: z.string().trim().max(MAX_NOTES_FIELD),
  accepting_orders: z.boolean(),
  open: timeSchema,
  close: timeSchema,
  days: z
    .array(z.number().int().min(0, "Dia inválido").max(6, "Dia inválido"))
    .min(1, "Escolhe pelo menos um dia")
    .max(7),
  pickup_slot_minutes: z.coerce
    .number()
    .int("Usa um número inteiro")
    .min(5, "Mínimo 5 minutos")
    .max(120, "Máximo 120 minutos"),
  min_lead_time_minutes: z.coerce
    .number()
    .int("Usa um número inteiro")
    .min(0, "Mínimo 0 minutos")
    .max(1440, "Máximo 1440 minutos"),
  payment_mode: z.enum(["manual", "mbway_api"]),
  mbway_payee: z.string().trim().regex(/^(\d{9})?$/, "9 dígitos ou vazio"),
});

export type SaveSiteSettingsInput = z.infer<typeof saveSiteSettingsSchema>;

export const categorySchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Indica o nome da categoria").max(60),
  sort_order: z.coerce
    .number()
    .int("Usa um número inteiro")
    .min(0)
    .max(999),
  is_active: z.boolean(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const dishSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Indica o nome do prato").max(80),
  description: z.string().trim().max(400).default(""),
  price: z.coerce
    .number({ message: "Preço inválido" })
    .min(0, "Preço inválido")
    .max(999, "Preço demasiado alto"),
  category_id: z.uuid().nullable(),
  image_url: z.string().trim().max(600).default(""),
  allergens: z.array(z.string().max(40)).max(60).default([]),
  is_active: z.boolean().default(true),
  is_sold_out: z.boolean().default(false),
  sort_order: z.coerce
    .number()
    .int("Usa um número inteiro")
    .min(0)
    .max(9999),
  available_from: optionalDate,
  available_until: optionalDate,
});

export type DishInput = z.infer<typeof dishSchema>;

/** Grupo de opções do prato (ex.: "Acompanhamento"). */
export const optionGroupSchema = z
  .object({
    id: z.uuid().optional(),
    dish_id: z.uuid({ message: "Prato inválido" }),
    name: z.string().trim().min(1, "Indica o nome do grupo").max(60),
    is_required: z.boolean().default(false),
    min_select: z.coerce
      .number({ message: "Usa um número inteiro" })
      .int("Usa um número inteiro")
      .min(0, "Mínimo inválido")
      .max(20, "Mínimo demasiado alto"),
    max_select: z.coerce
      .number({ message: "Usa um número inteiro" })
      .int("Usa um número inteiro")
      .min(1, "Máximo inválido")
      .max(20, "Máximo demasiado alto"),
    sort_order: z.coerce
      .number()
      .int("Usa um número inteiro")
      .min(0)
      .max(999),
  })
  .refine((g) => g.min_select <= g.max_select, {
    message: "O mínimo não pode exceder o máximo",
    path: ["min_select"],
  });

export type OptionGroupInput = z.infer<typeof optionGroupSchema>;

/** Opção dentro de um grupo (ex.: "Batata frita" +0,50 €). */
export const optionSchema = z.object({
  id: z.uuid().optional(),
  group_id: z.uuid({ message: "Grupo inválido" }),
  name: z.string().trim().min(1, "Indica o nome da opção").max(60),
  extra_price: z.coerce
    .number({ message: "Preço inválido" })
    .min(0, "Preço inválido")
    .max(999, "Preço demasiado alto"),
  is_active: z.boolean().default(true),
  sort_order: z.coerce
    .number()
    .int("Usa um número inteiro")
    .min(0)
    .max(999),
});

export type OptionInput = z.infer<typeof optionSchema>;

/** Alergénio (lista de referência da BD). */
export const allergenSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,40}$/, "Código inválido (só letras, números e hífen)"),
  name_pt: z.string().trim().min(2, "Indica o nome").max(60),
  sort_order: z.coerce
    .number()
    .int("Usa um número inteiro")
    .min(0)
    .max(999),
});

export type AllergenInput = z.infer<typeof allergenSchema>;
