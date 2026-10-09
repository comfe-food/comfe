"use server";

import "server-only";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSessionClient, requireAdmin } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import { saveSiteSettingsSchema } from "@/lib/validation/admin";

/**
 * Metadados das chaves — espelham a seed (`0004_seed.sql`). O upsert escreve
 * sempre as três colunas para não perder o `is_public` das chaves públicas.
 */
const META: Record<string, { description: string; is_public: boolean }> = {
  brand_name: { description: "Nome do estabelecimento", is_public: true },
  phone: {
    description: "Telefone (9 dígitos, sem indicativo)",
    is_public: true,
  },
  whatsapp_number: {
    description: "Número para o link wa.me",
    is_public: true,
  },
  instagram_url: {
    description: "Link do Instagram (deixar vazio para esconder o botão)",
    is_public: true,
  },
  opening_hours: { description: "Horário de pedidos", is_public: true },
  accepting_orders: {
    description: "Interruptor geral de pedidos",
    is_public: true,
  },
  pickup_only_notice: { description: "Aviso de recolha", is_public: true },
  hero_title: { description: "Título da página inicial", is_public: true },
  hero_subtitle: {
    description: "Subtítulo da página inicial",
    is_public: true,
  },
  story_title: { description: "Título da secção história", is_public: true },
  story_text: { description: "Texto da história", is_public: true },
  banner_message: {
    description: "Aviso temporário mostrado no topo do site (null = sem aviso)",
    is_public: true,
  },
  payment_mode: {
    description: '"manual" = cliente paga por MB WAY e a cozinha confirma | "mbway_api" = cobrança automática via Ifthenpay',
    is_public: false,
  },
  pickup_slot_minutes: {
    description: "Duração de cada intervalo de recolha",
    is_public: true,
  },
  min_lead_time_minutes: {
    description: "Antecedência mínima para a hora de recolha",
    is_public: true,
  },
  mbway_payee: {
    description: "Número MB WAY para o modo manual (null = usar o telefone)",
    is_public: false,
  },
};

/** Guarda as definições públicas do site e limpa a cache (`site`). */
export async function saveSiteSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin();
  if (!session) redirect("/admin/login");

  const enabledDays = new Set(
    formData
      .getAll("days")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
  );
  // Fallback para páginas antigas em cache que ainda enviam um único
  // `open`/`close` global em vez dos campos por dia (`open_0`, `close_0`, …).
  const legacyOpen = formData.get("open");
  const legacyClose = formData.get("close");
  const schedule = Array.from({ length: 7 }, (_, day) => {
    if (!enabledDays.has(day)) return null;
    const open = String(formData.get(`open_${day}`) ?? legacyOpen ?? "").trim();
    const close = String(
      formData.get(`close_${day}`) ?? legacyClose ?? "",
    ).trim();
    return { open, close };
  });

  const parsed = saveSiteSettingsSchema.safeParse({
    brand_name: formData.get("brand_name"),
    phone: formData.get("phone"),
    whatsapp_number: formData.get("whatsapp_number"),
    instagram_url: formData.get("instagram_url") ?? "",
    pickup_only_notice: formData.get("pickup_only_notice") ?? "",
    hero_title: formData.get("hero_title"),
    hero_subtitle: formData.get("hero_subtitle") ?? "",
    story_title: formData.get("story_title") ?? "",
    story_text: formData.get("story_text") ?? "",
    banner_message: formData.get("banner_message") ?? "",
    accepting_orders: formData.get("accepting_orders") === "on",
    opening_hours: { schedule },
    pickup_slot_minutes: formData.get("pickup_slot_minutes"),
    min_lead_time_minutes: formData.get("min_lead_time_minutes"),
    payment_mode: formData.get("payment_mode"),
    mbway_payee: formData.get("mbway_payee") ?? "",
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Dados inválidos.",
    };
  }

  const v = parsed.data;
  const values: Record<string, unknown> = {
    brand_name: v.brand_name,
    phone: v.phone,
    whatsapp_number: v.whatsapp_number,
    instagram_url: v.instagram_url,
    pickup_only_notice: v.pickup_only_notice,
    hero_title: v.hero_title,
    hero_subtitle: v.hero_subtitle,
    story_title: v.story_title,
    story_text: v.story_text,
    banner_message: v.banner_message,
    accepting_orders: v.accepting_orders,
    opening_hours: v.opening_hours,
    pickup_slot_minutes: v.pickup_slot_minutes,
    min_lead_time_minutes: v.min_lead_time_minutes,
    payment_mode: v.payment_mode,
    mbway_payee: v.mbway_payee,
  };

  const rows = Object.entries(values).map(([key, value]) => ({
    key,
    value,
    ...META[key],
  }));

  const supabase = await createSessionClient();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const { error } = await supabase
    .from("site_settings")
    .upsert(rows, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };

  updateTag("site");
  revalidatePath("/", "layout");
  return { ok: true, message: "Definições guardadas.", done: true };
}
