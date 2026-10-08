import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { OrderItemInput } from "@/lib/validation/order";

export interface PricedOption {
  group_id: string;
  group_name: string;
  option_id: string;
  option_name: string;
  extra_price: number;
}

export interface PricedItem {
  dish_id: string;
  dish_name: string;
  unit_price: number;
  quantity: number;
  selected_options: PricedOption[];
  item_notes: string;
  line_total: number;
}

export interface PricedOrder {
  items: PricedItem[];
  subtotal: number;
  total: number;
}

export class PricingError extends Error {
  constructor(
    message: string,
    public code:
      | "item_unavailable"
      | "option_invalid"
      | "option_required"
      | "empty"
      | "not_found",
    public dishName?: string,
  ) {
    super(message);
    this.name = "PricingError";
  }
}

/**
 * Recalça o preço do pedido a partir da base de dados.
 * NUNCA confiar nos preços enviados pelo browser.
 */
export async function priceOrder(
  supabase: SupabaseClient<Database>,
  inputs: OrderItemInput[],
): Promise<PricedOrder> {
  if (inputs.length === 0) {
    throw new PricingError("O pedido está vazio.", "empty");
  }

  const dishIds = [...new Set(inputs.map((i) => i.dishId))];

  const { data: dishes, error: dishesError } = await supabase
    .from("dishes")
    .select("id, name, price, is_active, is_sold_out, available_from, available_until")
    .in("id", dishIds);

  if (dishesError) {
    throw new PricingError(`Erro a ler pratos: ${dishesError.message}`, "not_found");
  }

  const dishMap = new Map((dishes ?? []).map((d) => [d.id, d]));

  const { data: groups, error: groupsError } = await supabase
    .from("option_groups")
    .select("id, dish_id, name, is_required, min_select, max_select")
    .in("dish_id", dishIds);
  if (groupsError) {
    throw new PricingError(`Erro a ler opções: ${groupsError.message}`, "not_found");
  }

  const groupIds = (groups ?? []).map((g) => g.id);
  const { data: options, error: optionsError } = groupIds.length
    ? await supabase
        .from("options")
        .select("id, group_id, name, extra_price, is_active")
        .in("group_id", groupIds)
    : { data: [] as never[], error: null };
  if (optionsError) {
    throw new PricingError(`Erro a ler opções: ${optionsError.message}`, "not_found");
  }

  const optionsByGroup = new Map<string, Map<string, (typeof options)[number]>>();
  for (const opt of options ?? []) {
    const map = optionsByGroup.get(opt.group_id) ?? new Map();
    map.set(opt.id, opt);
    optionsByGroup.set(opt.group_id, map);
  }

  const groupsByDish = new Map<string, (typeof groups)[number][]>();
  for (const group of groups ?? []) {
    const list = groupsByDish.get(group.dish_id) ?? [];
    list.push(group);
    groupsByDish.set(group.dish_id, list);
  }

  const priced: PricedItem[] = [];

  for (const input of inputs) {
    const dish = dishMap.get(input.dishId);
    if (!dish) {
      throw new PricingError("Prato não encontrado.", "not_found");
    }
    if (!dish.is_active || dish.is_sold_out) {
      throw new PricingError(
        `O prato «${dish.name}» já não está disponível.`,
        "item_unavailable",
        dish.name,
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    if (dish.available_from && dish.available_from > today) {
      throw new PricingError(
        `O prato «${dish.name}» já não está disponível.`,
        "item_unavailable",
        dish.name,
      );
    }
    if (dish.available_until && dish.available_until < today) {
      throw new PricingError(
        `O prato «${dish.name}» já não está disponível.`,
        "item_unavailable",
        dish.name,
      );
    }

    const dishGroups = groupsByDish.get(dish.id) ?? [];
    const selectedByGroup = new Map<string, string[]>();
    for (const optionId of input.optionIds) {
      const group = dishGroups.find((g) => optionsByGroup.get(g.id)?.has(optionId));
      if (!group) {
        throw new PricingError(
          `Opção inválida para «${dish.name}».`,
          "option_invalid",
          dish.name,
        );
      }
      const list = selectedByGroup.get(group.id) ?? [];
      list.push(optionId);
      selectedByGroup.set(group.id, list);
    }

    const selectedOptions: PricedOption[] = [];
    let extras = 0;

    for (const group of dishGroups) {
      const chosen = selectedByGroup.get(group.id) ?? [];
      const required = group.is_required || group.min_select > 0;
      if (chosen.length < Math.max(1, group.min_select) && required) {
        throw new PricingError(
          `Falta escolher «${group.name}» em «${dish.name}».`,
          "option_required",
          dish.name,
        );
      }
      if (chosen.length > group.max_select) {
        throw new PricingError(
          `Demasiadas opções em «${group.name}» para «${dish.name}».`,
          "option_invalid",
          dish.name,
        );
      }

      const groupOptions = optionsByGroup.get(group.id);
      for (const optionId of chosen) {
        const opt = groupOptions?.get(optionId);
        if (!opt || !opt.is_active) {
          throw new PricingError(
            `Opção indisponível em «${dish.name}».`,
            "option_invalid",
            dish.name,
          );
        }
        const extra = Number(opt.extra_price) || 0;
        extras += extra;
        selectedOptions.push({
          group_id: group.id,
          group_name: group.name,
          option_id: opt.id,
          option_name: opt.name,
          extra_price: extra,
        });
      }
    }

    const unit = round2(Number(dish.price) + extras);
    const lineTotal = round2(unit * input.quantity);

    priced.push({
      dish_id: dish.id,
      dish_name: dish.name,
      unit_price: unit,
      quantity: input.quantity,
      selected_options: selectedOptions,
      item_notes: input.notes.slice(0, 140),
      line_total: lineTotal,
    });
  }

  const subtotal = round2(priced.reduce((s, i) => s + i.line_total, 0));
  return { items: priced, subtotal, total: subtotal };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
