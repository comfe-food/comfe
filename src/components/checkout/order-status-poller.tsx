"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface StatusResponse {
  paymentStatus?: string;
  status?: string;
}

/**
 * Atualiza a página de confirmação quando o pagamento deixa de estar
 * pendente (MB WAY automático ou confirmação manual do cozinheiro).
 */
export function OrderStatusPoller({
  token,
  paid,
}: {
  token: string;
  paid: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(paid);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (done) return;
    timer.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${token}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as StatusResponse;
        if (data.paymentStatus === "paid") {
          setDone(true);
          router.refresh();
        }
      } catch {
        // manter a tentativa no próximo intervalo
      }
    }, 5_000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [token, done, router]);

  if (done) return null;
  return (
    <p
      className="flex items-center justify-center gap-2 text-sm font-semibold text-ink-muted"
      aria-live="polite"
      role="status"
    >
      <span
        aria-hidden="true"
        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent"
      />
      A verificar pagamento…
    </p>
  );
}