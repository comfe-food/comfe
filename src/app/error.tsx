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
      className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center"
    >
      <h1 className="text-2xl">{t("errorTitle")}</h1>
      <p className="mt-2 text-sm text-indigo-light">{t("errorGeneric")}</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-6">
        Tentar novamente
      </button>
    </main>
  );
}
