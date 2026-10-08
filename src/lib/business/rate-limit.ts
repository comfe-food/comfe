import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** Hash do IP para limitar pedidos sem guardar o IP em claro. */
export function hashIp(ip: string): string | null {
  if (!ip) return null;
  const secret = process.env.COMFE_SECRET_KEY;
  return createHash("sha256")
    .update(`${ip}:${secret ?? "comfe"}`)
    .digest("hex");
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "";
}

/** Comparação de segredos resistente a timing attacks. */
export function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export class RateLimitError extends Error {
  constructor() {
    super("Demasiados pedidos. Tenta dentro de momentos.");
    this.name = "RateLimitError";
  }
}

interface RateLimitConfig {
  ipLimit: number;
  phoneLimit: number;
  windowMinutes: number;
}

function getRateLimitConfig(): RateLimitConfig {
  return {
    ipLimit: Number(process.env.ORDER_RATE_LIMIT_IP ?? 3),
    phoneLimit: Number(process.env.ORDER_RATE_LIMIT_PHONE ?? 5),
    windowMinutes: 10,
  };
}

/**
 * Proteção anti-abuso: nº máximo de pedidos por IP e por telefone
 * dentro de uma janela de tempo.
 */
export async function assertOrderRateLimit(
  supabase: SupabaseClient<Database>,
  params: { ipHash: string | null; phone: string },
): Promise<void> {
  const { ipLimit, phoneLimit, windowMinutes } = getRateLimitConfig();
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  const query = supabase
    .from("orders")
    .select("id, customer_phone, ip_hash")
    .gte("created_at", since)
    .limit(50);

  const { data, error } = await query;
  if (error) {
    console.error("[comfe] Erro no limite de pedidos:", error.message);
    return; // não bloquear o cliente por falha do controlo
  }

  const rows = data ?? [];
  const byPhone = rows.filter((r) => r.customer_phone === params.phone).length;
  const byIp = params.ipHash
    ? rows.filter((r) => r.ip_hash === params.ipHash).length
    : 0;

  if (byPhone >= phoneLimit || byIp >= ipLimit) {
    throw new RateLimitError();
  }
}
