"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Pedidos" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/definicoes", label: "Definições" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Painel" className="flex items-center gap-4">
      {LINKS.map(({ href, label }) => {
        const active =
          href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`text-sm font-semibold ${
              active ? "text-accent" : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
