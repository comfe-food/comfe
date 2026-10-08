"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { formatEuro } from "@/lib/format";
import type { MenuDish } from "@/lib/data/menu";
import type { Allergen, NotePreset } from "@/lib/types";
import { t } from "@/lib/static-config";
import { useCart } from "@/components/cart/cart-context";
import { useMenuUi } from "@/components/menu/menu-context";
import { AllergenList } from "@/components/menu/allergens";

interface FormValues {
  selected: Record<string, string[]>;
  notes: string;
  quantity: number;
}

const MAX_NOTES = 140;
const MAX_QUANTITY = 20;

export function DishDialog({
  presets,
  allergens,
}: {
  presets: NotePreset[];
  allergens: Allergen[];
}) {
  const { activeDish, closeDish } = useMenuUi();
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!activeDish) return;

    lastFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDish();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      lastFocused.current?.focus();
    };
  }, [activeDish, closeDish]);

  if (!activeDish) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dish-dialog-title"
    >
      <button
        type="button"
        aria-label={t("close")}
        onClick={closeDish}
        className="absolute inset-0 bg-ink/50"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto border border-line bg-surface outline-none"
      >
        <DishForm
          key={activeDish.id}
          dish={activeDish}
          presets={presets}
          allergens={allergens}
          onClose={closeDish}
        />
      </div>
    </div>
  );
}

function DishForm({
  dish,
  presets,
  allergens,
  onClose,
}: {
  dish: MenuDish;
  presets: NotePreset[];
  allergens: Allergen[];
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [submitted, setSubmitted] = useState(false);

  const defaults = useMemo<FormValues>(
    () => ({
      selected: Object.fromEntries(dish.option_groups.map((g) => [g.id, []])),
      notes: "",
      quantity: 1,
    }),
    [dish],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: defaults,
    mode: "onSubmit",
  });

  const selected = watch("selected");
  const quantity = watch("quantity");
  const notes = watch("notes");

  const optionErrors = useMemo(() => {
    if (!submitted) return {} as Record<string, string>;
    const errs: Record<string, string> = {};
    for (const group of dish.option_groups) {
      const chosen = selected[group.id]?.length ?? 0;
      const required = group.is_required || group.min_select > 0;
      if (required && chosen < Math.max(1, group.min_select)) {
        errs[group.id] = t("errorOptionRequired");
      } else if (!required && chosen > group.max_select) {
        errs[group.id] = t("errorOptionMax", { max: group.max_select });
      } else if (chosen > group.max_select) {
        errs[group.id] = t("errorOptionMax", { max: group.max_select });
      }
    }
    return errs;
  }, [submitted, selected, dish.option_groups]);

  const unitPrice =
    Number(dish.price) +
    dish.option_groups.reduce(
      (sum, group) =>
        sum +
        (selected[group.id] ?? []).reduce((s, optId) => {
          const opt = group.options.find((o) => o.id === optId);
          return s + (opt ? Number(opt.extra_price) : 0);
        }, 0),
      0,
    );

  const total = unitPrice * (quantity || 1);
  const hasOptionErrors = Object.keys(optionErrors).length > 0;

  const toggleOption = (groupId: string, optionId: string, maxSelect: number) => {
    const all = getValues("selected") ?? {};
    const current = all[groupId] ?? [];
    const next = maxSelect <= 1
      ? current.includes(optionId)
        ? []
        : [optionId]
      : current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId].slice(0, maxSelect);
    setValue("selected", { ...all, [groupId]: next }, { shouldValidate: false });
  };

  const appendNote = (label: string) => {
    const current = getValues("notes") ?? "";
    if (current.includes(label)) return;
    const next = current.trim() ? `${current.trim()}, ${label}` : label;
    if (next.length > MAX_NOTES) return;
    setValue("notes", next, { shouldValidate: true });
  };

  const onSubmit = (values: FormValues) => {
    setSubmitted(true);
    if (hasOptionErrors) return;

    const options = dish.option_groups.flatMap((group) =>
      (values.selected[group.id] ?? []).map((optId) => {
        const opt = group.options.find((o) => o.id === optId);
        return {
          groupId: group.id,
          groupName: group.name,
          optionId: opt?.id ?? optId,
          optionName: opt?.name ?? "",
          extraPrice: opt ? Number(opt.extra_price) : 0,
        };
      }),
    );

    addItem(
      {
        dishId: dish.id,
        name: dish.name,
        imageUrl: dish.image_url,
        basePrice: Number(dish.price),
        options,
        notes: values.notes.trim().slice(0, MAX_NOTES),
      },
      values.quantity,
    );
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-line">
        {dish.image_url ? (
          <Image
            src={dish.image_url}
            alt={dish.name}
            fill
            sizes="(max-width: 640px) 100vw, 512px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-display text-4xl text-ink-muted" aria-hidden="true">
              Comfe
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-base border border-line bg-surface text-xl font-bold text-ink"
          aria-label={t("close")}
        >
          ×
        </button>
      </div>

      <div className="space-y-5 px-5 pt-4 pb-5 sm:px-6">
        <header>
          <h2 id="dish-dialog-title" className="text-2xl">
            {dish.name}
          </h2>
          <p className="mt-1 flex items-center gap-3 text-lg font-bold">
            {formatEuro(dish.price)}
            {dish.is_sold_out && (
              <span className="label border-danger/40 bg-danger-soft text-danger">{t("soldOut")}</span>
            )}
          </p>
          {dish.description && (
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {dish.description}
            </p>
          )}
        </header>

        <section aria-labelledby="allergens-heading">
          <h3 id="allergens-heading" className="mb-2 font-sans text-xs font-bold uppercase tracking-wide text-ink-muted">
            Alergénios
          </h3>
          <AllergenList codes={dish.allergens} allergens={allergens} />
        </section>

        {dish.option_groups.map((group) => {
          const chosen = selected[group.id] ?? [];
          const err = optionErrors[group.id];
          const isMulti = group.max_select > 1;
          const labelId = `group-${group.id}`;
          return (
            <section key={group.id} aria-labelledby={labelId}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 id={labelId} className="text-sm font-bold">
                  {group.name}
                </h3>
                <span className="text-2xs font-semibold text-ink-muted">
                  {group.is_required || group.min_select > 0
                    ? t("required")
                    : t("optional")}
                  {group.max_select > 1 ? ` · até ${group.max_select}` : ""}
                </span>
              </div>
              <div
                className="grid gap-2"
                role={isMulti ? "group" : "radiogroup"}
                aria-labelledby={labelId}
                aria-invalid={err ? true : undefined}
              >
                {group.options
                  .filter((o) => o.is_active)
                  .map((opt) => {
                    const isChosen = chosen.includes(opt.id);
                    const disabled =
                      !isChosen && !isMulti && chosen.length >= group.max_select;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role={isMulti ? "checkbox" : "radio"}
                        aria-checked={isChosen}
                        disabled={disabled}
                        onClick={() => toggleOption(group.id, opt.id, group.max_select)}
                        className={`flex min-h-[48px] items-center justify-between rounded-base border px-4 py-2.5 text-left text-sm font-semibold transition ${
                          isChosen
                            ? "border-accent bg-accent text-paper"
                            : "border-line bg-surface text-ink disabled:opacity-40"
                        }`}
                      >
                        <span>{opt.name}</span>
                        <span className="ml-3 text-xs font-bold">
                          {Number(opt.extra_price) > 0
                            ? `+ ${formatEuro(opt.extra_price)}`
                            : ""}
                        </span>
                      </button>
                    );
                  })}
              </div>
              {err && <p className="field-error">{err}</p>}
            </section>
          );
        })}

        <section aria-labelledby="notes-heading">
          <label htmlFor="dish-notes" className="field-label">
            <span id="notes-heading">{t("notes")}</span>
            <span className="ml-1 font-normal text-ink-muted">
              ({t("optional")})
            </span>
          </label>
          <input
            id="dish-notes"
            type="text"
            maxLength={MAX_NOTES}
            placeholder={t("notesPlaceholder")}
            className="field-input"
            {...register("notes")}
          />
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {presets
                .filter((p) => p.is_active)
                .slice(0, 4)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="min-h-[36px] rounded-base border border-line bg-surface px-2 py-1 text-xs font-semibold hover:border-ink"
                    onClick={() => appendNote(p.label)}
                  >
                    {p.label}
                  </button>
                ))}
            </div>
            <span className="shrink-0 text-2xs text-ink-muted" aria-live="polite">
              {(notes ?? "").length}/{MAX_NOTES}
            </span>
          </div>
        </section>

      </div>

      <div className="sticky bottom-0 border-t border-line bg-surface px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <label htmlFor="dish-quantity" className="field-label">
              {t("quantity")}
            </label>
            <div className="flex items-center gap-2">
              <Stepper
                label="Diminuir quantidade"
                symbol="−"
                onClick={() =>
                  setValue("quantity", Math.max(1, (quantity || 1) - 1))
                }
              />
              <output
                htmlFor="dish-quantity"
                id="dish-quantity"
                className="w-8 text-center text-lg font-bold"
              >
                {quantity}
              </output>
              <Stepper
                label="Aumentar quantidade"
                symbol="+"
                onClick={() =>
                  setValue("quantity", Math.min(MAX_QUANTITY, (quantity || 1) + 1))
                }
              />
            </div>
            <input type="hidden" {...register("quantity", { valueAsNumber: true })} />
          </div>
          <p className="text-right">
            <span className="block text-2xs font-semibold uppercase">
              {t("total")}
            </span>
            <span className="text-2xl font-bold">{formatEuro(total)}</span>
          </p>
        </div>

        {errors.quantity && <p className="field-error">{t("errorQuantityMin")}</p>}

        <button
          type="submit"
          className="btn btn-primary mt-3 w-full"
          disabled={dish.is_sold_out || !dish.is_active}
        >
          {dish.is_sold_out ? t("soldOut") : t("addToOrder")}
        </button>
      </div>
    </form>
  );
}

function Stepper({
  label,
  symbol,
  onClick,
}: {
  label: string;
  symbol: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-base border border-line text-xl font-bold text-ink hover:border-ink"
    >
      {symbol}
    </button>
  );
}
