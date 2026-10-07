import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getPublicSupabaseEnv } from "./env";

let client: SupabaseClient<Database> | null | undefined;

/**
 * Cliente para leituras públicas (sem sessão, papel `anon`).
 * Não lê cookies — pode ser usado dentro de funções com `'use cache'`.
 * O RLS decide o que este cliente vê.
 */
export function getPublicClient(): SupabaseClient<Database> | null {
  if (client !== undefined) return client;
  const env = getPublicSupabaseEnv();
  client = env
    ? createClient<Database>(env.url, env.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
  return client;
}
