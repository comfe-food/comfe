import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type {
  Allergen,
  Category,
  Dish,
  NotePreset,
  Option,
  OptionGroup,
} from "@/lib/types";
import { getPublicClient } from "@/lib/supabase/public";
import { getStaticConfig } from "@/lib/static-config";

export interface MenuOptionGroup extends OptionGroup {
  options: Option[];
}

export interface MenuDish extends Dish {
  option_groups: MenuOptionGroup[];
  category_name: string | null;
}

export interface MenuCategoryGroup {
  id: string;
  name: string;
  dishes: MenuDish[];
}

export interface MenuData {
  categories: MenuCategoryGroup[];
  dishes: MenuDish[];
  allergens: Allergen[];
}

/** Alergénios por omissão (static.json) quando a BD não responde. */
function fallbackAllergens(): Allergen[] {
  return getStaticConfig().allergens.map((a, i) => ({
    code: a.code,
    name_pt: a.name,
    sort_order: i + 1,
  }));
}

/**
 * Menu da semana. Cacheado por tag (`menu`) — o painel admin revalida com
 * `updateTag('menu')` para as alterações aparecerem de imediato.
 */
export async function getMenu(): Promise<MenuData> {
  "use cache";
  cacheTag("menu");
  cacheLife("hours");

  const supabase = getPublicClient();
  if (!supabase)
    return { categories: [], dishes: [], allergens: fallbackAllergens() };

  const [dishesRes, groupsRes, optionsRes, categoriesRes, allergensRes] =
    await Promise.all([
      supabase.from("dishes").select("*"),
      supabase.from("option_groups").select("*"),
      supabase.from("options").select("*"),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("allergens").select("*").order("sort_order"),
    ]);

  if (dishesRes.error || groupsRes.error || optionsRes.error || categoriesRes.error) {
    console.error(
      "[comfe] Erro a ler o menu:",
      dishesRes.error?.message ??
        groupsRes.error?.message ??
        optionsRes.error?.message ??
        categoriesRes.error?.message,
    );
    return { categories: [], dishes: [], allergens: fallbackAllergens() };
  }

  const optionsByGroup = new Map<string, Option[]>();
  for (const opt of optionsRes.data ?? []) {
    const list = optionsByGroup.get(opt.group_id) ?? [];
    list.push(opt);
    optionsByGroup.set(opt.group_id, list);
  }

  const groupsByDish = new Map<string, MenuOptionGroup[]>();
  const sortedGroups = [...(groupsRes.data ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  for (const group of sortedGroups) {
    const list = groupsByDish.get(group.dish_id) ?? [];
    list.push({
      ...group,
      options: (optionsByGroup.get(group.id) ?? []).sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
    });
    groupsByDish.set(group.dish_id, list);
  }

  const categories = categoriesRes.data ?? [];
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const dishes: MenuDish[] = [...(dishesRes.data ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((dish) => ({
      ...dish,
      option_groups: groupsByDish.get(dish.id) ?? [],
      category_name: dish.category_id
        ? (categoryName.get(dish.category_id) ?? null)
        : null,
    }));

  const groups: MenuCategoryGroup[] = [];
  for (const cat of categories) {
    const catDishes = dishes.filter((d) => d.category_id === cat.id);
    if (catDishes.length > 0) {
      groups.push({ id: cat.id, name: cat.name, dishes: catDishes });
    }
  }
  const withoutCategory = dishes.filter((d) => !d.category_id);
  if (withoutCategory.length > 0) {
    groups.push({ id: "sem-categoria", name: "Outros", dishes: withoutCategory });
  }

  const allergens =
    allergensRes.error || !allergensRes.data || allergensRes.data.length === 0
      ? fallbackAllergens()
      : allergensRes.data;

  return { categories: groups, dishes, allergens };
}

/** Atalhos rápidos de notas (chips) do checkout. */
export async function getNotePresets(): Promise<NotePreset[]> {
  "use cache";
  cacheTag("menu");
  cacheLife("hours");

  const supabase = getPublicClient();
  if (!supabase) {
    return [
      { id: "p1", label: "+ molho", sort_order: 1, is_active: true },
      { id: "p2", label: "− molho", sort_order: 2, is_active: true },
      { id: "p3", label: "sem cebola", sort_order: 3, is_active: true },
      { id: "p4", label: "sem picante", sort_order: 4, is_active: true },
    ];
  }

  const { data, error } = await supabase
    .from("note_presets")
    .select("*")
    .order("sort_order");

  if (error) {
    console.error("[comfe] Erro a ler atalhos de notas:", error.message);
    return [];
  }
  return (data ?? []) as NotePreset[];
}

export type { Category, Dish, Option, OptionGroup };
