import "server-only";

import { createSessionClient } from "@/lib/supabase/server";
import type { Category, Dish, Option, OptionGroup } from "@/lib/types";

export interface AdminOptionGroup extends OptionGroup {
  options: Option[];
}

export interface AdminMenuData {
  categories: Category[];
  dishes: Dish[];
  optionGroups: AdminOptionGroup[];
}

/**
 * Menu completo para o painel — a sessão de admin vê pratos inativos e fora
 * da janela de disponibilidade, que o site público não mostra.
 */
export async function getAdminMenu(): Promise<AdminMenuData> {
  const supabase = await createSessionClient();
  if (!supabase) return { categories: [], dishes: [], optionGroups: [] };

  const [categoriesRes, dishesRes, groupsRes, optionsRes] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order").order("name"),
    supabase.from("dishes").select("*").order("sort_order").order("name"),
    supabase.from("option_groups").select("*").order("sort_order"),
    supabase.from("options").select("*").order("sort_order"),
  ]);

  if (
    categoriesRes.error ||
    dishesRes.error ||
    groupsRes.error ||
    optionsRes.error
  ) {
    console.error(
      "[comfe]Erro a ler o menu do painel:",
      categoriesRes.error?.message ??
        dishesRes.error?.message ??
        groupsRes.error?.message ??
        optionsRes.error?.message,
    );
    return { categories: [], dishes: [], optionGroups: [] };
  }

  const optionsByGroup = new Map<string, Option[]>();
  for (const opt of optionsRes.data ?? []) {
    const list = optionsByGroup.get(opt.group_id) ?? [];
    list.push(opt);
    optionsByGroup.set(opt.group_id, list);
  }

  const optionGroups: AdminOptionGroup[] = (groupsRes.data ?? []).map(
    (group) => ({
      ...group,
      options: optionsByGroup.get(group.id) ?? [],
    }),
  );

  return {
    categories: (categoriesRes.data ?? []) as Category[],
    dishes: (dishesRes.data ?? []) as Dish[],
    optionGroups,
  };
}
