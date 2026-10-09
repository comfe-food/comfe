import Link from "next/link";
import { CurrentYear } from "@/components/site/current-year";
import { formatScheduleLines } from "@/lib/business/hours";
import { getStaticConfig, t } from "@/lib/static-config";
import type { SiteSettingsMap } from "@/lib/types";

export function SiteFooter({ settings }: { settings: SiteSettingsMap }) {
  const scheduleLines = formatScheduleLines(settings.opening_hours);

  return (
    <footer className="mt-auto bg-accent text-paper">
      <div className="mx-auto grid max-w-3xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
        <div>
          <p className="font-display text-xl">{settings.brand_name}</p>
          <p className="mt-2 text-paper/80">{settings.pickup_only_notice}</p>
        </div>

        <div>
          <h2 className="font-sans text-xs font-bold uppercase tracking-wide text-paper/80">
            Horário
          </h2>
          <p className="mt-2 space-y-0.5">
            {scheduleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>

        <div>
          <h2 className="font-sans text-xs font-bold uppercase tracking-wide text-paper/80">
            Contactos
          </h2>
          <p className="mt-2 flex flex-col gap-1">
            <a href={`tel:+351${settings.phone}`} className="text-paper/90 hover:text-paper">
              {settings.phone}
            </a>
            <a
              href={`https://wa.me/${settings.whatsapp_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-paper/90 hover:text-paper"
            >
              WhatsApp
            </a>
            {settings.instagram_url && (
              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-paper/90 hover:text-paper"
              >
                Instagram
              </a>
            )}
          </p>
        </div>
      </div>

      <div>
        <div className="mx-auto max-w-3xl space-y-2 px-4 py-5 text-2xs text-paper/80">
          <p>{getStaticConfig().seo.allergenNotice}</p>
          <p>{t("allergensDisclaimer")}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
            <span>© <CurrentYear /> {settings.brand_name}</span>
            <Link
              href="/politica-privacidade"
              className="text-paper/90 hover:text-paper"
            >
              {t("privacy")}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
