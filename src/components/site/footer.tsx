import Link from "next/link";
import { CurrentYear } from "@/components/site/current-year";
import { getStaticConfig, t } from "@/lib/static-config";
import type { SiteSettingsMap } from "@/lib/types";

export function SiteFooter({ settings }: { settings: SiteSettingsMap }) {
  const hours = settings.opening_hours;
  const dayNames = [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
  ];
  const daysLabel =
    hours.days.length === 7
      ? "Todos os dias"
      : hours.days.map((d) => dayNames[d]).join(", ");

  return (
    <footer className="mt-auto bg-indigo text-cream">
      <div className="mx-auto grid max-w-3xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
        <div>
          <p className="font-display text-xl">{settings.brand_name}</p>
          <p className="mt-2 text-cream/80">{settings.pickup_only_notice}</p>
        </div>

        <div>
          <h2 className="text-xs font-bold tracking-wide uppercase text-cream/70">
            Horário
          </h2>
          <p className="mt-2">
            {daysLabel}
            <br />
            {hours.open} – {hours.close}
          </p>
        </div>

        <div>
          <h2 className="text-xs font-bold tracking-wide uppercase text-cream/70">
            Contactos
          </h2>
          <p className="mt-2 flex flex-col gap-1">
            <a href={`tel:+351${settings.phone}`} className="underline underline-offset-2">
              {settings.phone}
            </a>
            <a
              href={`https://wa.me/${settings.whatsapp_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              WhatsApp
            </a>
            {settings.instagram_url && (
              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Instagram
              </a>
            )}
          </p>
        </div>
      </div>

      <div className="border-t border-cream/20">
        <div className="mx-auto max-w-3xl space-y-2 px-4 py-5 text-2xs text-cream/75">
          <p>{getStaticConfig().seo.allergenNotice}</p>
          <p>{t("allergensDisclaimer")}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
            <span>© <CurrentYear /> {settings.brand_name}</span>
            <Link
              href="/politica-privacidade"
              className="underline underline-offset-2"
            >
              {t("privacy")}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
