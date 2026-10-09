import Image from "next/image";
import Link from "next/link";
import type { SiteSettingsMap } from "@/lib/types";
import { CartButton } from "@/components/site/cart-button";
import { OpenStatus } from "@/components/site/open-status";
import { ScheduleHours } from "@/components/site/schedule-hours";

export function SiteHeader({ settings }: { settings: SiteSettingsMap }) {
  return (
    <header className="sticky top-0 z-40 bg-accent text-paper">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          aria-label={`${settings.brand_name} — página inicial`}
        >
          <Image
            src="/comfe-logo.png"
            alt={settings.brand_name}
            width={112}
            height={40}
            priority
            className="h-10"
            style={{ width: "auto" }}
          />
        </Link>
        <div className="flex items-center gap-4">
          <OpenStatus
            accepting_orders={settings.accepting_orders}
            opening_hours={settings.opening_hours}
          />
          <CartButton />
        </div>
      </div>
      <p className="mx-auto max-w-3xl px-4 pb-2 text-2xs text-paper/80">
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
      className="border-b border-warning/40 bg-warning-soft px-4 py-2.5 text-sm font-semibold text-warning"
    >
      <span className="mx-auto block max-w-3xl">{message}</span>
    </div>
  );
}

export function Hero({ settings }: { settings: SiteSettingsMap }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="mx-auto max-w-3xl px-4 pt-10 pb-8"
    >
      <h1 id="hero-heading" className="text-3xl leading-tight sm:text-4xl">
        {settings.hero_title}
      </h1>
      <p className="mt-3 max-w-xl text-base text-ink-muted sm:text-lg">
        {settings.hero_subtitle}
      </p>
      <ScheduleHours
        opening_hours={settings.opening_hours}
        accepting_orders={settings.accepting_orders}
        className="mt-5 w-full sm:max-w-sm"
      />
    </section>
  );
}
