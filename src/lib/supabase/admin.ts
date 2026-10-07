import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getServiceRoleEnv } from "./env";

let client: SupabaseClient<Database> | null | undefined;

/**
 * Cliente `service_role` — USAR APENAS NO SERVIDOR.
 * Bypassa o RLS; só pode ser usado em Route Handlers e Server Actions que
 * já tenham validado a sessão / os dados do cliente.
 */
export function getServiceClient(): SupabaseClient<Database> | null {
  if (client !== undefined) return client;
  const env = getServiceRoleEnv();
  if (!env) {
    client = null;
    return client;
  }
  client = createClient<Database>(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Levanta um erro claro quando a BD não está configurada. */
export function requireServiceClient(): SupabaseClient<Database> {
  const c = getServiceClient();
  if (!c) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Vê .env.example.",
    );
  }
  return c;
}
