import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { SiteSettingsMap } from "@/lib/types";
import {
  DEFAULT_OPENING_HOURS,
  normalizeOpeningHours,
} from "@/lib/business/hours";
import { getServiceClient } from "@/lib/supabase/admin";
import { getPublicClient } from "@/lib/supabase/public";

export const DEFAULT_SITE_SETTINGS: SiteSettingsMap = {
  brand_name: "Comfe",
  phone: "938067719",
  whatsapp_number: "351938067719",
  instagram_url: null,
  opening_hours: DEFAULT_OPENING_HOURS,
  accepting_orders: true,
  pickup_only_notice: "Apenas recolha no local.",
  hero_title: "Comida caseira, feita com carinho",
  hero_subtitle:
    "Menu novo todas as semanas. Encomenda, paga com MB WAY e recolhe quentinho.",
  story_title: "A história do Comfe",
  story_text:
    "O Comfe nasceu de uma ideia simples: comer bem, em casa ou a caminho, sem complicações.\n\nCozinhamos como em casa — com ingredientes frescos, tempo para fazer as coisas direito e a certeza de que a comida tem de saber a alguma coisa. O menu muda todas as semanas para não ficar tudo parado e para aproveitarmos o que está melhor na época.\n\nFazemos poucos pratos por dia, porque cada um leva o nosso cuidado. Quando acaba, acaba: pede com tempo.",
  banner_message: null,
  payment_mode: "manual",
  pickup_slot_minutes: 15,
  min_lead_time_minutes: 20,
  mbway_payee: null,
};

function coerceSettings(rows: { key: string; value: unknown }[]): SiteSettingsMap {
  const merged: Record<string, unknown> = { ...DEFAULT_SITE_SETTINGS };
  for (const row of rows) {
    if (row.value !== undefined) merged[row.key] = row.value;
  }
  const out = merged as unknown as SiteSettingsMap;

  // Sanitização defensiva dos campos estruturados
  out.opening_hours = normalizeOpeningHours(out.opening_hours);
  out.pickup_slot_minutes = Number(out.pickup_slot_minutes) || 15;
  out.min_lead_time_minutes = Number(out.min_lead_time_minutes) || 20;
  out.accepting_orders = Boolean(out.accepting_orders);
  // A coluna `value` é `jsonb not null`, por isso guardamos `""` em vez de
  // `null`; normalizamos de volta para `null` para manter o modelo do site.
  out.instagram_url = out.instagram_url || null;
  out.banner_message = out.banner_message || null;
  out.mbway_payee = out.mbway_payee || null;
  if (typeof out.phone !== "string" || !/^\d{9}$/.test(out.phone)) {
    out.phone = DEFAULT_SITE_SETTINGS.phone;
  }
  if (typeof out.whatsapp_number !== "string") {
    out.whatsapp_number = DEFAULT_SITE_SETTINGS.whatsapp_number;
  }
  return out;
}

/**
 * Definições públicas do site. Cacheadas por tag (`site`) e revalidadas pelo
 * painel admin quando o cozinheiro guarda as alterações.
 */
export async function getSiteSettings(): Promise<SiteSettingsMap> {
  "use cache";
  cacheTag("site");
  cacheLife("hours");

  const supabase = getPublicClient();
  if (!supabase) return DEFAULT_SITE_SETTINGS;

  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value");

  if (error || !data) {
    if (error) console.error("[comfe]Erro a ler site_settings:", error.message);
    return DEFAULT_SITE_SETTINGS;
  }
  return coerceSettings(data);
}

/**
 * Todas as definições (inclui chaves privadas como `payment_mode`).
 * Sem cache de propósito: só é chamada a partir de Route Handlers e nunca
 * é renderizada, para que valores privados não entrem no HTML pré-gerado.
 */
export async function getServerSettings(): Promise<SiteSettingsMap> {
  const supabase = getServiceClient();
  if (!supabase) return DEFAULT_SITE_SETTINGS;

  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value");

  if (error || !data) {
    if (error) console.error("[comfe]Erro a ler site_settings (servidor):", error.message);
    return DEFAULT_SITE_SETTINGS;
  }
  return coerceSettings(data);
}
