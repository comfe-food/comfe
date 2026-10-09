"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";

export function CartButton() {
  const { count } = useCart();

  return (
    <Link
      href="/pedido"
      className="text-sm font-semibold text-paper/90 hover:text-paper"
      aria-label={`Ver pedido${count > 0 ? `, ${count} itens` : ""}`}
    >
      Ver pedido{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
