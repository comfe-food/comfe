import Link from "next/link";
import { t } from "@/lib/static-config";

export default function NotFound() {
  return (
    <main
      id="conteudo"
      className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center"
    >
      <p className="font-display text-6xl text-indigo/30" aria-hidden="true">
        404
      </p>
      <h1 className="mt-4 text-2xl">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-sm text-indigo-light">{t("notFoundText")}</p>
      <Link href="/" className="btn btn-primary mt-6">
        {t("backToMenu")}
      </Link>
    </main>
  );
}
