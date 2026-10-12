"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";

export function CartButton() {
  const { count } = useCart();

  return (
    <Link
      href="/pedido"
      className="flex items-center gap-1.5 text-sm font-semibold text-paper/90 hover:text-paper"
      aria-label={`Carrinho${count > 0 ? `, ${count} itens` : ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
        <path d="M2 3h3l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6" />
      </svg>
      Carrinho
    </Link>
  );
}
