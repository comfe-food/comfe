import Link from "next/link";
import { t } from "@/lib/static-config";

export default function NotFound() {
  return (
    <main
      id="conteudo"
      className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4"
    >
      <p className="font-display text-3xl text-ink-muted" aria-hidden="true">
        404
      </p>
      <h1 className="mt-3 text-2xl">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t("notFoundText")}</p>
      <Link
        href="/"
        className="mt-5 self-start font-semibold underline underline-offset-4"
      >
        {t("backToMenu")}
      </Link>
    </main>
  );
}
