"use client";

import Image from "next/image";
import { formatEuro } from "@/lib/format";
import type { MenuDish } from "@/lib/data/menu";
import type { Allergen } from "@/lib/types";
import { t } from "@/lib/static-config";
import { useMenuUi } from "@/components/menu/menu-context";

export function DishCard({
  dish,
  allergens,
}: {
  dish: MenuDish;
  allergens: Allergen[];
}) {
  const { openDish } = useMenuUi();
  const disabled = dish.is_sold_out || !dish.is_active;

  const names = dish.allergens.map(
    (code) => allergens.find((a) => a.code === code)?.name_pt ?? code,
  );

  return (
    <article
      className="card overflow-hidden"
      aria-labelledby={`dish-${dish.id}`}
    >
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden bg-line sm:h-28 sm:w-28">
          {dish.image_url ? (
            <Image
              src={dish.image_url}
              alt={dish.name}
              fill
              sizes="112px"
              className="object-cover"
            />
          ) : (
            <div
              className="flex h-full items-center justify-center"
              aria-hidden="true"
            >
              <span className="font-display text-lg text-ink-muted">Comfe</span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3
            id={`dish-${dish.id}`}
            className="break-words text-base leading-snug sm:text-lg"
          >
            {dish.name}
          </h3>
          {dish.description && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink-muted sm:text-sm">
              {dish.description}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
            <span className="text-lg font-bold">{formatEuro(dish.price)}</span>
            {dish.allergens.length > 0 && (
              <span
                className="label"
                title={names.join(", ")}
                aria-label={`Alergénios: ${names.join(", ")}`}
              >
                Alergénios
              </span>
            )}
            {disabled && (
              <span className="label border-danger/40 bg-danger-soft text-danger">
                {t("soldOut")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 pt-0 sm:p-4 sm:pt-0">
        <button
          type="button"
          onClick={() => openDish(dish)}
          aria-haspopup="dialog"
          aria-label={`${t("viewDish")} — ${dish.name}`}
          className="btn min-h-[48px] w-full border border-line bg-surface text-sm hover:bg-paper sm:text-base"
        >
          {t("viewDish")}
        </button>
        <button
          type="button"
          onClick={() => openDish(dish)}
          disabled={disabled}
          aria-label={`${t("addToCart")} — ${dish.name}`}
          className="btn btn-primary min-h-[48px] w-full text-sm sm:text-base"
        >
          {disabled ? t("soldOut") : t("addToCart")}
        </button>
      </div>
    </article>
  );
}
