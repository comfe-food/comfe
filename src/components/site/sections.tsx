import { getStaticConfig, t } from "@/lib/static-config";
import type { SiteSettingsMap } from "@/lib/types";

export function StorySection({ settings }: { settings: SiteSettingsMap }) {
  if (!settings.story_text) return null;
  return (
    <section
      aria-labelledby="story-heading"
      className="mx-auto max-w-3xl px-4 py-10"
    >
      <div className="card bg-indigo p-6 text-cream sm:p-8">
        <h2 id="story-heading" className="text-2xl text-cream">
          {settings.story_title}
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-cream/90 sm:text-base">
          {settings.story_text.split("\n").filter(Boolean).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks({ settings }: { settings: SiteSettingsMap }) {
  const steps = getStaticConfig().steps;
  const hours = settings.opening_hours;
  const dayNames = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  return (
    <section
      aria-labelledby="how-heading"
      className="mx-auto max-w-3xl px-4 py-10"
    >
      <h2 id="how-heading" className="section-title">
        {t("howItWorks")}
      </h2>
      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <li key={step.number} className="card p-5">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo font-display text-lg text-cream"
            >
              {step.number}
            </span>
            <h3 className="mt-3 text-lg">{step.title}</h3>
            <p className="mt-1 text-sm text-indigo-light">{step.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <p className="card flex items-center gap-3 p-5 text-sm font-semibold">
          <span aria-hidden="true" className="text-2xl">🕘</span>
          Todos os dias, das {hours.open} às {hours.close}
        </p>
        <p className="card flex items-center gap-3 p-5 text-sm font-semibold">
          <span aria-hidden="true" className="text-2xl">🚶</span>
          {settings.pickup_only_notice}
        </p>
      </div>

      <p className="mt-3 text-xs text-indigo-light">
        Dias de pedidos:{" "}
        {hours.days.length === 7
          ? "todos os dias"
          : hours.days.map((d) => dayNames[d]).join(", ")}
      </p>
    </section>
  );
}
