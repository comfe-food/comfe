import type { SiteSettingsMap } from "@/lib/types";
import { t } from "@/lib/static-config";

export function ContactsSection({ settings }: { settings: SiteSettingsMap }) {
  const instagram = settings.instagram_url?.trim();
  const whatsapp = settings.whatsapp_number?.replace(/\D/g, "");

  return (
    <section
      aria-labelledby="contacts-heading"
      className="mx-auto max-w-3xl px-4 py-10"
    >
      <h2 id="contacts-heading" className="section-title">
        {t("contacts")}
      </h2>

      <div className="max-w-xs space-y-3">
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary w-full"
          >
            {t("whatsapp")}
          </a>
        )}

        <a
          href={`tel:+351${settings.phone}`}
          className="block text-sm font-semibold hover:text-accent"
        >
          {t("call")} {settings.phone}
        </a>

        {instagram && (
          <a
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-semibold hover:text-accent"
          >
            Instagram
          </a>
        )}
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        {t("pickupOnly")} {t("payMbWay")}.
      </p>
    </section>
  );
}
