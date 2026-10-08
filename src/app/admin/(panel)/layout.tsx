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
  // Sessão por pedido: nunca pode ser pré-renderizado (importa mesmo sem BD).
  await connection();

  const session = await requireAdmin();
  if (!session) redirect("/admin/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/admin" className="font-display text-xl tracking-tight">
              Comfe · Painel
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-semibold underline underline-offset-4"
            >
              Ver site
            </Link>
            <form action={signOutAdmin}>
              <button
                type="submit"
                className="text-sm font-semibold underline underline-offset-4 text-danger"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}