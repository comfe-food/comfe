import { getPickupSlots, slotToISO } from "@/lib/business/hours";
import { getSiteSettings } from "@/lib/data/site";
import { getMenu, getNotePresets } from "@/lib/data/menu";
import { connection } from "next/server";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { DishDialog } from "@/components/menu/dish-dialog";
import { MenuUiProvider } from "@/components/menu/menu-context";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { t } from "@/lib/static-config";

export const metadata = {
  title: "Pedido · Comfe",
  robots: { index: false },
};

export default async function PedidoPage() {
  // As horas de recolha dependem do instante do pedido → renderizar na hora
  // (não pode ser pré-renderizado no build).
  await connection();

  const [settings, menu, presets] = await Promise.all([
    getSiteSettings(),
    getMenu(),
    getNotePresets(),
  ]);

  const slots = getPickupSlots(settings)
    .map((label) => ({ label, value: slotToISO(label) }))
    .filter((s): s is { label: string; value: string } => Boolean(s.value));

  return (
    <MenuUiProvider>
      <SiteHeader settings={settings} />
      <main className="flex-1">
        {settings.accepting_orders ? (
          <CheckoutForm slots={slots} dishes={menu.dishes} />
        ) : (
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h1 className="section-title">{t("closedNow")}</h1>
            <p className="text-ink-muted">Volta durante o horário de funcionamento.</p>
          </div>
        )}
        <DishDialog presets={presets} allergens={menu.allergens} />
      </main>
      <SiteFooter settings={settings} />
    </MenuUiProvider>
  );
}
