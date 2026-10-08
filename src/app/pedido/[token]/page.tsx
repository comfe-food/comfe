import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicOrderByToken, type PublicOrderView } from "@/lib/data/orders";
import { formatEuro, formatTime } from "@/lib/format";
import { t } from "@/lib/static-config";
import { OrderStatusPoller } from "@/components/checkout/order-status-poller";
import { SiteFooter } from "@/components/site/footer";
import { getSiteSettings } from "@/lib/data/site";
import { SiteHeader } from "@/components/site/header";

export const metadata = {
  title: "Estado do pedido · Comfe",
  robots: { index: false },
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "A aguardar pagamento",
  new: "Pedido confirmado",
  preparing: "Em preparação",
  ready: "Pronto para recolher",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function PaymentCard({ order }: { order: PublicOrderView }) {
  const paid = order.paymentStatus === "paid";

  if (paid) {
    return (
      <div className="border border-success/40 bg-success-soft p-5">
        <p className="font-bold text-success">Pagamento confirmado</p>
        <p className="mt-1 text-sm text-ink-muted">
          O teu pedido já está na cozinha.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="mb-2 font-display text-lg">Como pagar</h2>
      {order.paymentMode === "mbway_api" ? (
        <div className="space-y-2 text-sm">
          <p>
            Vais receber em breve o pedido de pagamento na tua app{" "}
            <strong>MB WAY</strong>. Abre a app e confirma o valor de{" "}
            <strong>{formatEuro(order.total)}</strong>.
          </p>
          <p className="text-ink-muted">
            Assim que pagas, o pedido entra automaticamente na cozinha.
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p>
            Envia <strong>{formatEuro(order.total)}</strong> por{" "}
            <strong>MB WAY</strong> para o número{" "}
            <strong className="text-base tracking-wide">
              {order.mbwayPayee ?? order.customerPhone}
            </strong>
            .
          </p>
          <p className="text-ink-muted">
            Assim que confirmarmos o pagamento, começamos a preparar o teu
            pedido.
          </p>
        </div>
      )}
    </div>
  );
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const settings = await getSiteSettings();
  const order = await getPublicOrderByToken(token);

  if (!order) notFound();

  return (
    <>
      <SiteHeader settings={settings} />
      <main className="mx-auto max-w-3xl flex-1 space-y-6 px-4 py-8">
        <header>
          <h1 className="section-title">{t("orderStatus")}</h1>
          <p className="font-bold">
            Pedido nº {order.orderNumber}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <span className="label">{STATUS_LABEL[order.status] ?? order.status}</span>
            {order.paymentStatus === "paid" ? (
              <span className="label border-success/40 bg-success-soft text-success">
                Pago
              </span>
            ) : (
              <span className="label border-warning/40 bg-warning-soft text-warning">
                Por pagar
              </span>
            )}
          </p>
          {/* O poller atualiza a página quando o pagamento é confirmado */}
          <OrderStatusPoller token={token} paid={order.paymentStatus === "paid"} />
        </header>
        <PaymentCard order={order} />
        <div className="card divide-y divide-line">
          {order.items.map((item) => (
            <div key={item.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold">
                  {item.quantity}× {item.dish_name}
                </p>
                <p className="shrink-0 font-bold">{formatEuro(item.line_total)}</p>
              </div>
              {item.selected_options.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-sm text-ink-muted">
                  {item.selected_options.map((o, i) => (
                    <li key={i}>
                      {String(o.option)}
                      {Number(o.extra_price) > 0 &&
                        ` · +${formatEuro(Number(o.extra_price))}`}
                    </li>
                  ))}
                </ul>
              )}
              {item.item_notes && (
                <p className="mt-1 text-sm text-ink-muted">«{item.item_notes}»</p>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-4">
            <span className="font-bold">{t("subtotal")}</span>
            <span className="text-xl font-bold">{formatEuro(order.total)}</span>
          </div>
        </div>

        <p className="text-sm text-ink-muted">
          {order.pickupTime
            ? `Recolha: ${formatTime(order.pickupTime)}`
            : "Recolhe quando estiver pronto."}
        </p>

        {order.paymentStatus !== "paid" && (
          <Link
            href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(
              `Olá! Estou com uma dúvida sobre o pedido nº ${order.orderNumber}.`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-semibold underline underline-offset-4"
          >
            {t("whatsapp")}
          </Link>
        )}
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}