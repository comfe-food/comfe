import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "./env";

/**
 * Cliente Supabase ligado à sessão (cookies) para uso no servidor.
 * Devolve `null` quando as variáveis de ambiente não estão configuradas.
 */
export async function createSessionClient(): Promise<SupabaseClient<Database> | null> {
  const env = getPublicSupabaseEnv();
  if (!env) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado a partir de um Server Component: o middleware trata dos cookies.
        }
      },
    },
  });
}

export interface AdminSession {
  user: User;
  isAdmin: true;
}

/**
 * Valida a sessão e o papel `admin` — a fronteira de segurança do painel.
 * Usar em Server Components, Server Actions e Route Handlers.
 */
export async function requireAdmin(): Promise<AdminSession | null> {
  const supabase = await createSessionClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") return null;
  return { user, isAdmin: true };
}
