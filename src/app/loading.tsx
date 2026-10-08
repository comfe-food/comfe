import { t } from "@/lib/static-config";

export default function Loading() {
  return (
    <main
      id="conteudo"
      className="mx-auto max-w-3xl px-4 py-10"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="text-sm font-semibold text-ink-muted">{t("loading")}</p>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse border border-line bg-surface" />
        ))}
      </div>
    </main>
  );
}
