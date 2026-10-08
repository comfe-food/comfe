import { getMenu, getNotePresets } from "@/lib/data/menu";
import { getSiteSettings } from "@/lib/data/site";
import { t } from "@/lib/static-config";
import { CartBar } from "@/components/cart/cart-bar";
import { DishDialog } from "@/components/menu/dish-dialog";
import { MenuSection } from "@/components/menu/menu-section";
import { MenuUiProvider } from "@/components/menu/menu-context";
import { ContactsSection } from "@/components/site/contacts";
import { SiteFooter } from "@/components/site/footer";
import { Hero, SiteBanner, SiteHeader } from "@/components/site/header";
import { HowItWorks, StorySection } from "@/components/site/sections";

export default async function HomePage() {
  const [settings, menu, presets] = await Promise.all([
    getSiteSettings(),
    getMenu(),
    getNotePresets(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: settings.brand_name,
    description: settings.hero_subtitle,
    servesCuisine: "Comida caseira",
    priceRange: "€€",
    acceptsReservations: false,
    address: {
      "@type": "PostalAddress",
      addressCountry: "PT",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: settings.opening_hours.days.map(
          (d) =>
            [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ][d],
        ),
        opens: settings.opening_hours.open,
        closes: settings.opening_hours.close,
      },
    ],
    potentialAction: {
      "@type": "OrderAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/pedido`,
      },
      deliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModePickUp",
    },
    hasMenu: {
      "@type": "Menu",
      name: t("menu"),
      hasMenuSection: menu.categories.map((cat) => ({
        "@type": "MenuSection",
        name: cat.name,
        hasMenuItem: cat.dishes.map((dish) => ({
          "@type": "MenuItem",
          name: dish.name,
          description: dish.description ?? undefined,
          offers: {
            "@type": "Offer",
            price: Number(dish.price).toFixed(2),
            priceCurrency: "EUR",
            availability:
              dish.is_sold_out || !dish.is_active
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
          },
        })),
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MenuUiProvider>
        <SiteBanner message={settings.banner_message} />
        <SiteHeader settings={settings} />

        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Saltar para o conteúdo
        </a>

        <main id="conteudo" className="flex-1">
          <Hero settings={settings} />

          <div className="mx-auto max-w-3xl px-4 pb-6">
            <MenuSection menu={menu} />
          </div>

          <StorySection settings={settings} />
          <HowItWorks settings={settings} />
          <ContactsSection settings={settings} />

          <CartBar />
          <DishDialog presets={presets} allergens={menu.allergens} />
        </main>

        <SiteFooter settings={settings} />
      </MenuUiProvider>
    </>
  );
}
