import type { MenuData } from "@/lib/data/menu";
import { t } from "@/lib/static-config";
import { DishCard } from "@/components/menu/dish-card";

export function MenuSection({ menu }: { menu: MenuData }) {
  if (menu.dishes.length === 0) {
    return (
      <section id="menu" aria-labelledby="menu-heading" className="scroll-mt-20">
        <h2 id="menu-heading" className="section-title">
          {t("menu")}
        </h2>
        <div className="card p-6 text-center">
          <p className="font-bold">{t("emptyMenu")}</p>
          <p className="mt-1 text-sm text-indigo-light">{t("emptyMenuHint")}</p>
        </div>
      </section>
    );
  }

  return (
    <section id="menu" aria-labelledby="menu-heading" className="scroll-mt-20">
      <h2 id="menu-heading" className="section-title">
        {t("menu")}
      </h2>

      {menu.categories.length > 1 && (
        <nav
          aria-label="Categorias do menu"
          className="scrollbar-thin -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {menu.categories.map((cat) => (
            <a
              key={cat.id}
              href={`#cat-${cat.id}`}
              className="chip shrink-0 border border-cream-deep hover:bg-cream-deep"
            >
              {cat.name}
            </a>
          ))}
        </nav>
      )}

      <div className="space-y-8">
        {menu.categories.map((cat) => (
          <div key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-24">
            <h3 className="mb-3 text-lg text-indigo-light">{cat.name}</h3>
            <div className="space-y-3">
              {cat.dishes.map((dish) => (
                <DishCard key={dish.id} dish={dish} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
