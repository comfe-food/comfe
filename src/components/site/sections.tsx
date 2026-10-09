import { formatScheduleLines } from "@/lib/business/hours";
import { getStaticConfig, t } from "@/lib/static-config";
import type { SiteSettingsMap } from "@/lib/types";

export function StorySection({ settings }: { settings: SiteSettingsMap }) {
  if (!settings.story_text) return null;
  return (
    <section
      aria-labelledby="story-heading"
      className="mx-auto max-w-3xl px-4 py-10"
    >
      <div className="border-t-2 border-accent pt-6">
        <h2 id="story-heading" className="text-2xl">
          {settings.story_title}
        </h2>
        <div className="mt-4 max-w-2xl space-y-4 text-sm leading-relaxed sm:text-base">
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
  const scheduleLines = formatScheduleLines(settings.opening_hours);

  return (
    <section
      aria-labelledby="how-heading"
      className="mx-auto max-w-3xl px-4 py-10"
    >
      <h2 id="how-heading" className="section-title">
        {t("howItWorks")}
      </h2>

      <ol className="border-t-2 border-accent">
        {steps.map((step) => (
          <li
            key={step.number}
            className="grid grid-cols-[2rem_1fr] gap-x-3 border-b border-line py-4"
          >
            <span className="font-display text-base text-accent" aria-hidden="true">
              {step.number}
            </span>
            <div>
              <h3 className="text-base">{step.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="space-y-0.5 font-semibold">
          {scheduleLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="font-semibold">{settings.pickup_only_notice}</p>
      </div>
    </section>
  );
}
