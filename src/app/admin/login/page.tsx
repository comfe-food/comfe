import Link from "next/link";
import { LoginForm } from "@/components/admin/login-form";

export const metadata = {
  title: "Entrar · Comfe",
  robots: { index: false },
};

export default function AdminLoginPage() {
  return (
    <main className="admin-surface flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <LoginForm />
        <Link
          href="/"
          className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-ink-muted hover:text-accent"
        >
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
            <path d="M10 5 3 12l7 7M3 12h12a6 6 0 0 1 6 6" />
          </svg>
          Voltar ao site
        </Link>
      </div>
    </main>
  );
}
