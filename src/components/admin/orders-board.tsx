"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelOrderAdmin,
  setOrderStatus,
  type ActionResult,
} from "@/app/admin/actions";
import type { AdminOrder } from "@/lib/data/admin-orders";
import { ActionMenu } from "@/components/admin/action-menu";
import { formatEuro, formatTime } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { getBrowserClient } from "@/lib/supabase/client";

const SOUND_URL = "/sounds/new-order.wav";
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Por confirmar",
  new: "Novo",
  preparing: "Em preparação",
  ready: "Pronto",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export function OrdersBoard({ initialOrders }: { initialOrders: AdminOrder[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [keepAwake, setKeepAwake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sincroniza quando o servidor re-renderiza (props novas) sem navegação —
  // ajustar estado durante a renderização, não num efeito.
  const [prevOrders, setPrevOrders] = useState(initialOrders);
  if (prevOrders !== initialOrders) {
    setPrevOrders(initialOrders);
    setOrders(initialOrders);
  }

  const incoming = useMemo(
    () => orders.filter((o) => o.status === "new"),
    [orders],
  );
  const inProgress = useMemo(
    () => orders.filter((o) => o.status !== "new"),
    [orders],
  );

  // Realtime: novo pedido ou mudanças sem re-carregar a página
  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Som de pedido novo: enquanto houver pedidos por abrir, toca a cada 10 s
  useEffect(() => {
    if (!soundEnabled || incoming.length === 0) return;
    const play = () => audioRef.current?.play().catch(() => {});
    const id = setInterval(play, 10_000);
    play();
    return () => clearInterval(id);
  }, [soundEnabled, incoming.length]);

  // Manter o ecrã ligado (com degradação silenciosa)
  useEffect(() => {
    if (!keepAwake) return;
    let lock: { release: () => Promise<void> } | undefined;
    let cancelled = false;
    (async () => {
      const wake = (navigator as { wakeLock?: unknown }).wakeLock as
        | { request: (t: string) => Promise<{ release: () => Promise<void> }> }
        | undefined;
      if (wake) {
        try {
          const l = await wake.request("screen");
          if (cancelled) await l.release();
          else lock = l;
        } catch {
          /* não suportado — degradação silenciosa */
        }
      }
    })();
    return () => {
      cancelled = true;
      lock?.release().catch(() => {});
    };
  }, [keepAwake]);

  async function run(action: Promise<ActionResult>) {
    const result = await action;
    if (!result.ok) setError(result.error ?? "Erro ao atualizar o pedido.");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Pedidos</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className={`btn ${soundEnabled ? "btn-primary" : "btn-secondary"} px-4 py-1.5 text-xs`}
          >
            {soundEnabled ? "Som ligado" : "Ativar som"}
          </button>
          {soundEnabled && (
            <button
              type="button"
              onClick={() => audioRef.current?.play().catch(() => {})}
              className="btn btn-secondary px-4 py-1.5 text-xs"
            >
              Testar
            </button>
          )}
          <button
            type="button"
            onClick={() => setKeepAwake((k) => !k)}
            className={`btn ${keepAwake ? "btn-primary" : "btn-secondary"} px-4 py-1.5 text-xs`}
          >
            {keepAwake ? "Ecrã ligado" : "Manter ecrã ligado"}
          </button>
        </div>
      </div>

      <audio ref={audioRef} src={SOUND_URL} preload="auto" />

      <div className="grid grid-cols-2 border border-line bg-surface">
        <div className="border-r border-line p-4 text-center">
          <p className="font-display text-3xl">{incoming.length}</p>
          <p className="mt-1 text-2xs font-semibold uppercase text-ink-muted">
            Novos
          </p>
        </div>
        <div className="p-4 text-center">
          <p className="font-display text-3xl">{inProgress.length}</p>
          <p className="mt-1 text-2xs font-semibold uppercase text-ink-muted">
            Em curso
          </p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-bold text-danger"
        >
          {error}
        </p>
      )}

      {orders.length === 0 && (
        <div className="border-t border-line py-6 text-ink-muted">
          Sem pedidos ativos neste momento.
        </div>
      )}

      <section aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="section-title">
          Em curso
        </h2>
        <div className="space-y-3">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} showTicker={o.status === "new"}>
              <StatusActions order={o} run={run} />
            </OrderCard>
          ))}
        </div>
      </section>
    </main>
  );
}

function StatusActions({
  order,
  run,
}: {
  order: AdminOrder;
  run: (action: Promise<ActionResult>) => Promise<void>;
}) {
  const next: Partial<Record<OrderStatus, OrderStatus>> = {
    new: "preparing",
    preparing: "ready",
    ready: "completed",
  };
  const label: Partial<Record<OrderStatus, string>> = {
    new: "Começar a preparar",
    preparing: "Pronto para recolher",
    ready: "Concluir",
  };

  const target = next[order.status];
  const nextLabel = target ? label[order.status] : undefined;
  const cancel = () => run(cancelOrderAdmin(order.id));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {target && (
        <button
          type="button"
          className="btn btn-primary flex-1 md:flex-none"
          onClick={() => run(setOrderStatus(order.id, target))}
        >
          {nextLabel}
        </button>
      )}
      <button
        type="button"
        className="hidden text-sm font-semibold text-danger hover:opacity-80 md:inline-block"
        onClick={cancel}
      >
        Cancelar
      </button>
      <div className="md:hidden">
        <ActionMenu
          ariaLabel={`Ações do pedido nº ${order.orderNumber}`}
          items={[
            ...(target && nextLabel
              ? [
                  {
                    label: nextLabel,
                    onClick: () => run(setOrderStatus(order.id, target)),
                  },
                ]
              : []),
            { label: "Cancelar", danger: true, onClick: cancel },
          ]}
        />
      </div>
    </div>
  );
}

function OrderCard({
  order,
  children,
  showTicker,
}: {
  order: AdminOrder;
  children: React.ReactNode;
  showTicker?: boolean;
}) {
  return (
    <article
      className={`card relative p-5 ${showTicker ? "border-danger" : ""}`}
      aria-label={`Pedido nº ${order.orderNumber}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-xl">Pedido nº {order.orderNumber}</p>
        <span
          className={`label ${
            order.status === "new" ? "border-danger/40 bg-danger-soft text-danger" : ""
          }`}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </header>

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <dt className="inline font-semibold">Cliente:</dt>{" "}
          <dd className="inline">{order.customerName}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Telefone:</dt>{" "}
          <dd className="inline">{order.customerPhone}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Chegou às:</dt>{" "}
          <dd className="inline">{formatTime(order.createdAt)}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Recolha:</dt>{" "}
          <dd className="inline">
            {order.pickupTime ? formatTime(order.pickupTime) : "Quando estiver pronto"}
          </dd>
        </div>
      </dl>

      <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-2">
            <span>
              <span className="font-bold">{item.quantity}×</span> {item.dishName}
              {item.options.length > 0 && (
                <span className="text-xs text-ink-muted">
                  {" "}
                  · {item.options.map((o) => o.option).join(", ")}
                </span>
              )}
              {item.itemNotes && (
                <span className="block text-xs text-ink-muted">
                  «{item.itemNotes}»
                </span>
              )}
            </span>
            <span className="shrink-0 font-semibold">{formatEuro(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="mt-2 text-sm text-ink-muted">Notas: {order.notes}</p>
      )}

      <p className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="text-2xs font-semibold uppercase text-ink-muted">
          Total
        </span>
        <span className="font-display text-2xl">{formatEuro(order.total)}</span>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </article>
  );
}