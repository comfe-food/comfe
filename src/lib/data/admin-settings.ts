import "server-only";

import { DEFAULT_SITE_SETTINGS } from "@/lib/data/site";
import { normalizeOpeningHours } from "@/lib/business/hours";
import { createSessionClient } from "@/lib/supabase/server";
import type { SiteSettingsMap } from "@/lib/types";

/**
 * Definições completas para o painel — a sessão de admin lê também as chaves
 * internas (`is_public = false`), ao contrário do site público.
 */
export async function getAdminSiteSettings(): Promise<SiteSettingsMap> {
  const supabase = await createSessionClient();
  if (!supabase) return DEFAULT_SITE_SETTINGS;

  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error || !data) {
    if (error) console.error("[comfe]Erro a ler site_settings:", error.message);
    return DEFAULT_SITE_SETTINGS;
  }

  const merged: Record<string, unknown> = { ...DEFAULT_SITE_SETTINGS };
  for (const row of data) {
    if (row.value !== undefined && row.value !== null) merged[row.key] = row.value;
  }
  const out = merged as SiteSettingsMap;
  out.opening_hours = normalizeOpeningHours(out.opening_hours);
  return out;
}
