import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { signOutAdmin } from "../actions";

export const metadata = {
  title: "Painel · Comfe",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  const session = await requireAdmin();
  if (!session) redirect("/admin/login");

  return (
    <div className="admin-surface flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-accent-dark bg-accent text-paper shadow-md shadow-accent/10">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href="/admin"
              aria-label="Comfe — página inicial do painel"
              className="flex items-center gap-2.5"
            >
              <Image
                src="/comfe-logo.png"
                alt="Comfe"
                width={104}
                height={36}
                className="h-8 w-auto"
              />
              <span className="hidden border-l border-paper/25 pl-3 text-2xs font-bold uppercase tracking-[0.2em] text-paper/70 sm:inline">
                Painel
              </span>
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-1.5 px-2.5 text-sm font-semibold text-paper/85 hover:bg-paper/10 hover:text-paper"
            >
              Ver site
              <ExternalIcon />
            </Link>
            <form action={signOutAdmin}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center px-2.5 text-sm font-semibold text-paper/70 hover:bg-paper/10 hover:text-paper"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
      <footer className="mx-auto w-full max-w-4xl px-4 py-6 text-center text-2xs font-semibold uppercase tracking-wider text-ink-muted/70">
        Comfe · Área reservada
      </footer>
    </div>
  );
}

function ExternalIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 5h6v6M19 5l-9 9" />
      <path d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" />
    </svg>
  );
}
