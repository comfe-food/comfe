"use client";

import { useEffect } from "react";
import { t } from "@/lib/static-config";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="conteudo"
      className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4"
    >
      <h1 className="text-2xl">{t("errorTitle")}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t("errorGeneric")}</p>
      <button
        type="button"
        onClick={reset}
        className="btn btn-primary mt-5 self-start"
      >
        Tentar novamente
      </button>
    </main>
  );
}
