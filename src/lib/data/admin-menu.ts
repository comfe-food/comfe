import "server-only";

import { createSessionClient } from "@/lib/supabase/server";
import type { Category, Dish } from "@/lib/types";

export interface AdminMenuData {
  categories: Category[];
  dishes: Dish[];
}

/**
 * Menu completo para o painel — a sessão de admin vê pratos inativos e fora
 * da janela de disponibilidade, que o site público não mostra.
 */
export async function getAdminMenu(): Promise<AdminMenuData> {
  const supabase = await createSessionClient();
  if (!supabase) return { categories: [], dishes: [] };

  const [categoriesRes, dishesRes] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order").order("name"),
    supabase.from("dishes").select("*").order("sort_order").order("name"),
  ]);

  if (categoriesRes.error || dishesRes.error) {
    console.error(
      "[comfe]Erro a ler o menu do painel:",
      categoriesRes.error?.message ?? dishesRes.error?.message,
    );
    return { categories: [], dishes: [] };
  }

  return {
    categories: (categoriesRes.data ?? []) as Category[],
    dishes: (dishesRes.data ?? []) as Dish[],
  };
}
