"use client";

import Image from "next/image";
import { formatEuro } from "@/lib/format";
import type { MenuDish } from "@/lib/data/menu";
import { t } from "@/lib/static-config";
import { useMenuUi } from "@/components/menu/menu-context";
import { AllergenIcons } from "@/components/menu/allergens";

export function DishCard({ dish }: { dish: MenuDish }) {
  const { openDish } = useMenuUi();
  const disabled = dish.is_sold_out || !dish.is_active;

  return (
    <article className="card flex overflow-hidden">
      <button
        type="button"
        onClick={() => openDish(dish)}
        className="flex flex-1 items-stretch gap-3 p-3 text-left sm:gap-4 sm:p-4"
        aria-haspopup="dialog"
      >
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-cream-dark sm:h-28 sm:w-28">
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
              <span className="font-display text-lg text-indigo/40">Comfe</span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate text-base leading-snug sm:text-lg">{dish.name}</h3>
          {dish.description && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-indigo-light sm:text-sm">
              {dish.description}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
            <span className="text-lg font-bold">{formatEuro(dish.price)}</span>
            <AllergenCodes codes={dish.allergens} />
            {disabled && (
              <span className="chip bg-danger-soft text-danger">{t("soldOut")}</span>
            )}
          </div>
        </div>
      </button>

      <div className="flex shrink-0 items-center border-l border-cream-dark p-2">
        <button
          type="button"
          onClick={() => openDish(dish)}
          disabled={disabled}
          className="btn btn-primary h-full min-h-[44px] px-4 sm:px-5"
          aria-label={`${t("addToCart")} — ${dish.name}`}
        >
          {disabled ? t("soldOut") : `+ ${t("addToCart")}`}
        </button>
      </div>
    </article>
  );
}

function AllergenCodes({ codes }: { codes: string[] }) {
  if (codes.length === 0) return null;
  return <AllergenIcons codes={codes} />;
}
