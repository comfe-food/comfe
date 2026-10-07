const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasPublicSupabase(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getPublicSupabaseEnv(): { url: string; anonKey: string } | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    warnMissing("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return null;
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export function getServiceRoleEnv(): { url: string; serviceKey: string } | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    warnMissing("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }
  return { url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_ROLE_KEY };
}

let warned = false;
function warnMissing(names: string) {
  if (warned || process.env.NODE_ENV === "production") return;
  warned = true;
  console.warn(
    `[comfe] Variáveis de ambiente em falta (${names}). A correr em modo vazio — sem dados da base de dados.`,
  );
}
