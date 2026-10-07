"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatEuro } from "@/lib/format";
import { t } from "@/lib/static-config";
import { useCart } from "@/components/cart/cart-context";

/** Barra fixa no fundo: "Ver pedido · 2 itens · 14,50 €". */
export function CartBar() {
  const { count, subtotal } = useCart();
  const pathname = usePathname();

  if (count === 0 || pathname === "/pedido") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Link
        href="/pedido"
        className="mx-auto flex min-h-[56px] max-w-lg items-center justify-between gap-3 rounded-full bg-indigo px-6 text-cream shadow-xl transition hover:bg-indigo-dark"
      >
        <span className="font-bold">{t("viewOrder")}</span>
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="rounded-full bg-cream/20 px-2 py-0.5">
            {count} {count === 1 ? "item" : "itens"}
          </span>
          <span className="text-base font-bold">{formatEuro(subtotal)}</span>
        </span>
      </Link>
    </div>
  );
}
