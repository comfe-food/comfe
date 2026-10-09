"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatEuro } from "@/lib/format";
import { t } from "@/lib/static-config";
import { MAX_ORDER_NOTES, MAX_QUANTITY } from "@/lib/validation/order";
import { unitPrice, useCart } from "@/components/cart/cart-context";
import { useMenuUi } from "@/components/menu/menu-context";
import type { MenuDish } from "@/lib/data/menu";

const checkoutSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Indica o teu nome")
    .max(80, "Demasiados caracteres"),
  customerPhone: z
    .string()
    .trim()
    .regex(/^9\d{8}$/, "Número inválido (9 dígitos, começa por 9)"),
  pickupTime: z.string(),
  notes: z.string().trim().max(MAX_ORDER_NOTES, `Máximo ${MAX_ORDER_NOTES} caracteres`),
  website: z.string().max(0),
});

interface CheckoutSlot {
  label: string;
  value: string;
}

interface OrderResponse {
  token?: string;
  error?: string;
}

export function CheckoutForm({
  slots,
  dishes,
}: {
  slots: CheckoutSlot[];
  dishes: MenuDish[];
}) {
  const router = useRouter();
  const cart = useCart();
  const { openDish } = useMenuUi();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dishById = new Map(dishes.map((d) => [d.id, d]));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { pickupTime: "", notes: "", website: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setServerError(null);

    const payload = {
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      pickupTime: values.pickupTime || null,
      notes: values.notes || "",
      website: values.website ?? "",
      items: cart.items.map((item) => ({
        dishId: item.dishId,
        optionIds: item.options.map((o) => o.optionId),
        quantity: item.quantity,
        notes: item.notes,
      })),
    };

    let res: Response;
    try {
      res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      setServerError(t("errorGeneric"));
      setSubmitting(false);
      return;
    }

    const data = (await res.json().catch(() => null)) as OrderResponse | null;

    if (res.ok && res.status === 201 && data?.token) {
      cart.clear();
      router.push(`/pedido/${data.token}`);
      return;
    }

    if (res.status === 409) setServerError(t("errorOrderClosed"));
    else if (res.status === 429) setServerError(t("errorTooManyOrders"));
    else setServerError(data?.error || t("errorGeneric"));
    setSubmitting(false);
  });

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="section-title">{t("emptyCart")}</p>
        <p className="mb-4 text-ink-muted">{t("emptyCartHint")}</p>
        <Link href="/" className="font-semibold hover:text-accent">
          {t("backToMenu")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <h1 className="section-title">{t("orderSummary")}</h1>

      {/* Honeypot invisível */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        {...register("website")}
      />

      <section aria-labelledby="checkout-items" className="card">
        <h2 id="checkout-items" className="sr-only">
          {t("orderSummary")}
        </h2>
        {cart.items.map((item) => {
          const up = unitPrice(item);
          const dish = dishById.get(item.dishId);
          return (
            <div key={item.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold">
                  {item.quantity}× {item.name}
                </p>
                <p className="shrink-0 font-bold">{formatEuro(up * item.quantity)}</p>
              </div>
              {item.options.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-sm text-ink-muted">
                  {item.options.map((o) => (
                    <li key={o.optionId}>
                      {o.optionName}
                      {Number(o.extraPrice) > 0 && ` · +${formatEuro(o.extraPrice)}`}
                    </li>
                  ))}
                </ul>
              )}
              {item.notes && (
                <p className="mt-1 text-sm text-ink-muted">«{item.notes}»</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Diminuir quantidade"
                    disabled={item.quantity <= 1}
                    onClick={() => cart.setQuantity(item.id, item.quantity - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-base border border-line text-lg font-bold disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Aumentar quantidade"
                    disabled={item.quantity >= MAX_QUANTITY}
                    onClick={() => cart.setQuantity(item.id, item.quantity + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-base border border-line text-lg font-bold disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                {dish && (
                  <button
                    type="button"
                    onClick={() => openDish(dish, item)}
                    className="min-h-[36px] rounded-base border border-line px-3 text-sm font-semibold"
                  >
                    {t("edit")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => cart.removeItem(item.id)}
                  className="min-h-[36px] rounded-base border border-line px-3 text-sm font-semibold text-danger"
                >
                  {t("remove")}
                </button>
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between px-5 py-4 text-lg">
          <span className="font-bold">{t("total")}</span>
          <span className="text-2xl font-bold">{formatEuro(cart.subtotal)}</span>
        </div>
      </section>

      <Link
        href="/"
        className="inline-block font-semibold text-accent"
      >
        + {t("addMore")}
      </Link>

      <fieldset className="card space-y-4 p-5">
        <legend className="sr-only">Dados de contacto</legend>

        <div>
          <label htmlFor="checkout-name" className="field-label">
            {t("customerName")} <span className="text-danger">*</span>
          </label>
          <input
            id="checkout-name"
            type="text"
            autoComplete="given-name"
            maxLength={80}
            className="field-input"
            {...register("customerName")}
          />
          {errors.customerName && (
            <p className="field-error">{errors.customerName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="checkout-phone" className="field-label">
            {t("customerPhone")} <span className="text-danger">*</span>
          </label>
          <input
            id="checkout-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="9XXXXXXXX"
            className="field-input"
            {...register("customerPhone")}
          />
          {errors.customerPhone && (
            <p className="field-error">{errors.customerPhone.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="checkout-pickup" className="field-label">
            {t("pickupTime")}
            <span className="ml-1 font-normal text-ink-muted">({t("optional")})</span>
          </label>
          <select id="checkout-pickup" className="field-input" {...register("pickupTime")}>
            <option value="">{t("pickupTimeAsap")}</option>
            {slots.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {errors.pickupTime && (
            <p className="field-error">{errors.pickupTime.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="checkout-notes" className="field-label">
            {t("generalNotes")}
            <span className="ml-1 font-normal text-ink-muted">({t("optional")})</span>
          </label>
          <textarea
            id="checkout-notes"
            rows={2}
            maxLength={MAX_ORDER_NOTES}
            placeholder={t("generalNotesPlaceholder")}
            className="field-input"
            {...register("notes")}
          />
          {errors.notes && <p className="field-error">{errors.notes.message}</p>}
        </div>
      </fieldset>

      {serverError && (
        <p role="alert" className="border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {serverError}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
        {submitting ? t("processing") : t("confirmAndPay")}
      </button>

      <p className="text-2xs text-ink-muted">
        Ao continuar confirmas que os dados estão corretos e aceitas a{" "}
        <Link href="/politica-privacidade" className="font-semibold hover:text-accent">
          Política de Privacidade
        </Link>
        .
      </p>
    </form>
  );
}