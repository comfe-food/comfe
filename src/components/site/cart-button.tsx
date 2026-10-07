"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";

export function CartButton() {
  const { count } = useCart();

  return (
    <Link
      href="/pedido"
      className="relative flex min-h-[40px] items-center gap-2 rounded-full bg-cream px-4 text-sm font-bold text-indigo"
      aria-label={`Ver pedido${count > 0 ? `, ${count} itens` : ""}`}
    >
      <span aria-hidden="true">🛒</span>
      <span className="hidden sm:inline">Ver pedido</span>
      {count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo px-1 text-2xs font-bold text-cream">
          {count}
        </span>
      )}
    </Link>
  );
}
