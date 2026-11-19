"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelOrderAdmin,
  confirmManualPaymentAdmin,
  setOrderStatus,
  type ActionResult,
} from "@/app/admin/actions";
import type { AdminOrder } from "@/lib/data/admin-orders";
import { ActionMenu } from "@/components/admin/action-menu";
import { formatEuro, formatTime } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
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
const STATUS_TONE: Partial<Record<OrderStatus, string>> = {
  pending_payment: "border-warning/40 bg-warning-soft text-warning",
  new: "border-danger/40 bg-danger-soft text-danger",
  preparing: "border-accent/30 bg-accent-soft text-accent",
  ready: "border-success/40 bg-success-soft text-success",
};
const GROUPS: { title: string; statuses: OrderStatus[] }[] = [
  { title: "Por atender", statuses: ["pending_payment", "new"] },
  { title: "Em preparação", statuses: ["preparing"] },
  { title: "Prontos para recolha", statuses: ["ready"] },
];

export function OrdersBoard({ initialOrders }: { initialOrders: AdminOrder[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [keepAwake, setKeepAwake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [prevOrders, setPrevOrders] = useState(initialOrders);
  if (prevOrders !== initialOrders) {
    setPrevOrders(initialOrders);
    setOrders(initialOrders);
  }

  const counts = useMemo(
    () => ({
      attention: orders.filter((o) =>
        ["pending_payment", "new"].includes(o.status),
      ).length,
      preparing: orders.filter((o) => o.status === "preparing").length,
      ready: orders.filter((o) => o.status === "ready").length,
      new: orders.filter((o) => o.status === "new").length,
    }),
    [orders],
  );

  const normalizedQuery = query.trim().toLocaleLowerCase("pt-PT");
  const visibleOrders = useMemo(() => {
    const priority: Partial<Record<OrderStatus, number>> = {
      pending_payment: 0,
      new: 1,
      preparing: 2,
      ready: 3,
    };
    return orders
      .filter((order) => {
        if (!normalizedQuery) return true;
        return [
          String(order.orderNumber),
          order.customerName,
          order.customerPhone,
        ].some((value) => value.toLocaleLowerCase("pt-PT").includes(normalizedQuery));
      })
      .sort((a, b) => {
        const byStatus =
          (priority[a.status] ?? 9) - (priority[b.status] ?? 9);
        if (byStatus !== 0) return byStatus;
        if (a.pickupTime && b.pickupTime && a.pickupTime !== b.pickupTime) {
          return a.pickupTime.localeCompare(b.pickupTime);
        }
        return a.createdAt.localeCompare(b.createdAt);
      });
  }, [orders, normalizedQuery]);

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | undefined;
    const supabase = getBrowserClient();

    async function subscribe() {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
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
    }

    subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (!soundEnabled || counts.new === 0) return;
    const play = () => audioRef.current?.play().catch(() => {});
    const id = setInterval(play, 10_000);
    play();
    return () => clearInterval(id);
  }, [soundEnabled, counts.new]);

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

  useEffect(() => {
    const frame = requestAnimationFrame(() => setNow(Date.now()));
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 4_000);
    return () => clearTimeout(id);
  }, [notice]);

  async function run(action: Promise<ActionResult>, successMessage?: string) {
    const result = await action;
    if (!result.ok) {
      setError(result.error ?? "Erro ao atualizar o pedido.");
      setNotice(null);
    } else {
      setError(null);
      if (successMessage) setNotice(successMessage);
    }
    router.refresh();
  }

  async function copyPhone(order: AdminOrder) {
    try {
      await navigator.clipboard.writeText(order.customerPhone);
      setCopiedId(order.id);
      setTimeout(
        () => setCopiedId((current) => (current === order.id ? null : current)),
        2_000,
      );
    } catch {
      setError("Não foi possível copiar o número. Liga diretamente para o cliente.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 px-4 py-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xs font-bold uppercase tracking-[0.2em] text-accent">
            Cozinha
          </p>
          <h1 className="mt-1 text-3xl">Pedidos</h1>
        </div>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Atualização em direto
        </p>
      </div>

      <audio ref={audioRef} src={SOUND_URL} preload="auto" />

      <div className="admin-card grid grid-cols-3 overflow-hidden">
        <Metric value={counts.attention} label="Por atender" tone="danger" />
        <Metric value={counts.preparing} label="A preparar" tone="accent" />
        <Metric value={counts.ready} label="Prontos" tone="success" />
      </div>

      <div className="admin-card flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[200px] flex-1">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Procurar por nº, nome ou telefone"
            aria-label="Procurar pedidos"
            className="field-input pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <BoardToggle
            active={soundEnabled}
            onClick={() => setSoundEnabled((value) => !value)}
            icon={<SoundIcon />}
          >
            {soundEnabled ? "Som ligado" : "Ativar som"}
          </BoardToggle>
          {soundEnabled && (
            <button
              type="button"
              onClick={() => audioRef.current?.play().catch(() => {})}
              className="btn btn-secondary px-3 text-xs"
            >
              Testar
            </button>
          )}
          <BoardToggle
            active={keepAwake}
            onClick={() => setKeepAwake((value) => !value)}
            icon={<SunIcon />}
          >
            {keepAwake ? "Ecrã ligado" : "Manter ecrã ligado"}
          </BoardToggle>
        </div>
      </div>

      {error && (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="alert alert-success">
          {notice}
        </p>
      )}

      {visibleOrders.length === 0 && (
        <div className="admin-card px-5 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center border border-line bg-paper text-accent">
            <CheckIcon />
          </div>
          <p className="mt-3 font-display text-xl">
            {orders.length === 0
              ? "Tudo em dia por aqui"
              : "Nenhum pedido encontrado"}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {orders.length === 0
              ? "Os novos pedidos aparecem aqui automaticamente."
              : `Sem resultados para «${query}».`}
          </p>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="btn btn-secondary mt-4"
            >
              Limpar pesquisa
            </button>
          )}
        </div>
      )}

      {GROUPS.map((group) => {
        const items = visibleOrders.filter((order) =>
          group.statuses.includes(order.status),
        );
        if (items.length === 0) return null;
        return (
          <section key={group.title} aria-label={group.title} className="space-y-3">
            <div className="flex items-baseline justify-between gap-2 border-b border-line pb-2">
              <h2 className="font-display text-xl">{group.title}</h2>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                {items.length} {items.length === 1 ? "pedido" : "pedidos"}
              </span>
            </div>
            <div className="space-y-3">
              {items.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  now={now}
                  copied={copiedId === order.id}
                  onCopy={() => copyPhone(order)}
                  showTicker={order.status === "new"}
                >
                  <StatusActions order={order} run={run} />
                </OrderCard>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}

function Metric({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "danger" | "accent" | "success";
}) {
  const accent = {
    danger: "border-t-danger text-danger",
    accent: "border-t-accent text-accent",
    success: "border-t-success text-success",
  }[tone];
  return (
    <div className={`border-t-[3px] px-2 py-4 text-center sm:px-4 ${accent}`}>
      <p className="font-display text-3xl leading-none sm:text-4xl">{value}</p>
      <p className="mt-2 text-2xs font-bold uppercase tracking-wider text-ink-muted">
        {label}
      </p>
    </div>
  );
}

function BoardToggle({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`btn px-3 text-xs ${active ? "btn-primary" : "btn-secondary"}`}
    >
      {icon}
      {children}
    </button>
  );
}

function StatusActions({
  order,
  run,
}: {
  order: AdminOrder;
  run: (action: Promise<ActionResult>, successMessage?: string) => Promise<void>;
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
  const cancel = () => {
    if (!confirm(`Cancelar o pedido nº ${order.orderNumber}?`)) return;
    void run(cancelOrderAdmin(order.id), "Pedido cancelado");
  };
  const payment = () =>
    run(confirmManualPaymentAdmin(order.id), "Pagamento confirmado");

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {order.status === "pending_payment" && (
        <button type="button" className="btn btn-primary flex-1 md:flex-none" onClick={payment}>
          Confirmar pagamento
        </button>
      )}
      {target && (
        <button
          type="button"
          className="btn btn-primary flex-1 md:flex-none"
          onClick={() => run(setOrderStatus(order.id, target), "Estado atualizado")}
        >
          {nextLabel}
        </button>
      )}
      <button
        type="button"
        className="hidden min-h-11 px-2 text-sm font-semibold text-danger hover:opacity-80 md:inline-block"
        onClick={cancel}
      >
        Cancelar
      </button>
      <div className="md:hidden">
        <ActionMenu
          ariaLabel={`Ações do pedido nº ${order.orderNumber}`}
          items={[
            ...(order.status === "pending_payment"
              ? [{ label: "Confirmar pagamento", onClick: payment }]
              : []),
            ...(target && nextLabel
              ? [
                  {
                    label: nextLabel,
                    onClick: () =>
                      run(setOrderStatus(order.id, target), "Estado atualizado"),
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
  copied,
  onCopy,
  now,
}: {
  order: AdminOrder;
  children: React.ReactNode;
  showTicker?: boolean;
  copied: boolean;
  onCopy: () => void;
  now: number | null;
}) {
  const elapsed = elapsedLabel(order.createdAt, now);
  const itemsCount = order.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <article
      className={`admin-card overflow-hidden ${showTicker ? "border-danger ring-1 ring-danger/20" : ""}`}
      aria-label={`Pedido nº ${order.orderNumber}`}
    >
      <header
        className={`flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 ${
          showTicker ? "border-danger/30 bg-danger-soft" : "border-line bg-paper/50"
        }`}
      >
        <p className="font-display text-xl">
          Pedido nº <span className="text-2xl">{order.orderNumber}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {elapsed && (
            <span className="text-2xs font-semibold text-ink-muted">{elapsed}</span>
          )}
          <span className={`label ${STATUS_TONE[order.status] ?? ""}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </header>

      <div className="space-y-4 p-5">
        <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-2xs font-bold uppercase tracking-wider text-ink-muted">
              Cliente
            </dt>
            <dd className="font-semibold">{order.customerName}</dd>
          </div>
          <div>
            <dt className="text-2xs font-bold uppercase tracking-wider text-ink-muted">
              Telefone
            </dt>
            <dd className="flex items-center gap-1">
              <a
                href={`tel:${order.customerPhone.replace(/\s/g, "")}`}
                className="font-semibold hover:text-accent hover:underline"
              >
                {order.customerPhone}
              </a>
              <button
                type="button"
                onClick={onCopy}
                aria-label={`Copiar telefone de ${order.customerName}`}
                title="Copiar telefone"
                className="icon-btn h-8 w-8 border-0 bg-transparent"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
              {copied && (
                <span className="text-2xs font-bold text-success">Copiado</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-2xs font-bold uppercase tracking-wider text-ink-muted">
              Chegou às
            </dt>
            <dd className="font-semibold">{formatTime(order.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-2xs font-bold uppercase tracking-wider text-ink-muted">
              Recolha
            </dt>
            <dd className="font-semibold">
              {order.pickupTime
                ? formatTime(order.pickupTime)
                : "Quando estiver pronto"}
            </dd>
          </div>
        </dl>

        <ul className="space-y-2 border-t border-line pt-4 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3">
              <span className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-6 min-w-6 shrink-0 items-center justify-center border border-line bg-paper px-1 text-xs font-bold">
                  {item.quantity}×
                </span>
                <span>
                  <span className="font-semibold">{item.dishName}</span>
                  {item.options.length > 0 && (
                    <span className="block text-xs text-ink-muted">
                      {item.options.map((option) => option.option).join(", ")}
                    </span>
                  )}
                  {item.itemNotes && (
                    <span className="block text-xs italic text-ink-muted">
                      «{item.itemNotes}»
                    </span>
                  )}
                </span>
              </span>
              <span className="shrink-0 font-semibold">
                {formatEuro(item.lineTotal)}
              </span>
            </li>
          ))}
        </ul>

        {order.notes && (
          <p className="border-l-[3px] border-warning bg-warning-soft px-3 py-2 text-sm font-semibold text-warning">
            Notas: {order.notes}
          </p>
        )}

        <p className="flex items-center justify-between border-t border-line pt-4">
          <span className="text-2xs font-bold uppercase tracking-wider text-ink-muted">
            Total · {itemsCount} {itemsCount === 1 ? "artigo" : "artigos"}
          </span>
          <span className="font-display text-2xl">{formatEuro(order.total)}</span>
        </p>

        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    </article>
  );
}

function elapsedLabel(createdAt: string, now: number | null) {
  if (now === null) return null;
  const minutes = Math.floor((now - new Date(createdAt).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  return `há ${Math.floor(minutes / 60)} h`;
}

function SearchIcon() {
  return (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="17"
        height="17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m16.5 16.5 4 4" />
      </svg>
    </span>
  );
}

function SoundIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15 9a4 4 0 0 1 0 6" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="11" height="11" rx="1" />
      <path d="M15 6V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 12 5 5L20 6" />
    </svg>
  );
}
