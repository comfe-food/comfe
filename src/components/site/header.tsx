import Link from "next/link";
import type { SiteSettingsMap } from "@/lib/types";
import { t } from "@/lib/static-config";
import { CartButton } from "@/components/site/cart-button";
import { OpenStatus } from "@/components/site/open-status";

export function SiteHeader({ settings }: { settings: SiteSettingsMap }) {
  return (
    <header className="sticky top-0 z-40 border-b border-indigo-dark bg-indigo text-cream">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="font-display text-2xl tracking-tight"
          aria-label={`${settings.brand_name} — página inicial`}
        >
          {settings.brand_name}
        </Link>
        <div className="flex items-center gap-2">
          <OpenStatus
            accepting_orders={settings.accepting_orders}
            opening_hours={settings.opening_hours}
          />
          <CartButton />
        </div>
      </div>
      <p className="mx-auto max-w-3xl px-4 pb-2 text-2xs text-cream/80">
        {settings.pickup_only_notice}
      </p>
    </header>
  );
}

export function SiteBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="bg-warning px-4 py-2.5 text-center text-sm font-bold text-white"
    >
      {message}
    </div>
  );
}

export function Hero({ settings }: { settings: SiteSettingsMap }) {
  const hours = settings.opening_hours;
  return (
    <section
      aria-labelledby="hero-heading"
      className="mx-auto max-w-3xl px-4 pt-6 pb-8 text-center"
    >
      <h1 id="hero-heading" className="text-3xl leading-tight sm:text-4xl">
        {settings.hero_title}
      </h1>
      <p className="mt-3 text-base text-indigo-light sm:text-lg">
        {settings.hero_subtitle}
      </p>
      <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo px-4 py-2 text-sm font-bold text-cream">
        <span aria-hidden="true">🕘</span>
        Todos os dias · {hours.open}–{hours.close}
      </p>
      <p className="mt-2 text-sm font-semibold text-indigo-light">
        {t("pickupOnly")}
      </p>
    </section>
  );
}
