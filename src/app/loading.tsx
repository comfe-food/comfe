import { t } from "@/lib/static-config";

export default function Loading() {
  return (
    <main
      id="conteudo"
      className="mx-auto max-w-3xl px-4 py-10"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="text-sm font-semibold text-indigo-light">{t("loading")}</p>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-28 animate-pulse bg-cream-dark/60" />
        ))}
      </div>
    </main>
  );
}
