"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface StatusResponse {
  status?: string;
}

/**
 * Atualiza a página de confirmação quando o estado do pedido muda
 * (em preparação, pronto para recolher, etc.).
 */
export function OrderStatusPoller({
  token,
  status,
}: {
  token: string;
  status: string;
}) {
  const router = useRouter();
  const current = useRef(status);

  useEffect(() => {
    current.current = status;
  }, [status]);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${token}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as StatusResponse;
        if (data.status && data.status !== current.current) {
          current.current = data.status;
          router.refresh();
        }
      } catch {
        // manter a tentativa no próximo intervalo
      }
    }, 5_000);
    return () => clearInterval(timer);
  }, [token, router]);

  return null;
}
