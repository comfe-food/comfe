import { getAdminSiteSettings } from "@/lib/data/admin-settings";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata = {
  title: "Definições · Painel · Comfe",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const settings = await getAdminSiteSettings();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-7">
      <p className="text-2xs font-bold uppercase tracking-[0.2em] text-accent">
        Configuração
      </p>
      <h1 className="mt-1 text-3xl">Definições</h1>
      <p className="mt-1 text-sm text-ink-muted">
        O que guardares aqui aparece no site público de imediato.
      </p>
      <SettingsForm settings={settings} />
    </main>
  );
}
