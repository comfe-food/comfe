"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ActionResult } from "@/app/admin/actions";
import {
  deleteCategory,
  deleteDish,
  setDishFlags,
} from "@/app/admin/menu-actions";
import { CategoryForm } from "@/components/admin/category-form";
import { DishForm } from "@/components/admin/dish-form";
import { OptionGroupsEditor } from "@/components/admin/option-groups-editor";
import { formatEuro } from "@/lib/format";
import type { AdminOptionGroup } from "@/lib/data/admin-menu";
import type { Category, Dish } from "@/lib/types";

export function MenuEditor({
  categories,
  dishes,
  optionGroups,
}: {
  categories: Category[];
  dishes: Dish[];
  optionGroups: AdminOptionGroup[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | "new" | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | "new" | null>(
    null,
  );
  const [editingOptions, setEditingOptions] = useState<Dish | null>(null);

  async function run(action: Promise<ActionResult>) {
    const result = await action;
    if (!result.ok) setError(result.error ?? "Erro ao guardar.");
    router.refresh();
  }

  const uncategorized = dishes.filter((dish) => !dish.category_id);
  const optionsDish =
    editingOptions ??
    (editingDish && editingDish !== "new" ? editingDish : null);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Menu</h1>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setEditingCategory("new");
              setEditingDish(null);
              setEditingOptions(null);
            }}
            className="btn btn-secondary"
          >
            Nova categoria
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingDish("new");
              setEditingCategory(null);
              setEditingOptions(null);
            }}
            className="btn btn-primary"
          >
            Novo prato
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-bold text-danger"
        >
          {error}
        </p>
      )}

      {editingDish && (
        <DishForm
          key={editingDish === "new" ? "new" : editingDish.id}
          dish={editingDish === "new" ? undefined : editingDish}
          categories={categories}
          onDone={() => setEditingDish(null)}
        />
      )}

      {optionsDish && (
        <OptionGroupsEditor
          key={`options-${optionsDish.id}`}
          dish={optionsDish}
          groups={optionGroups.filter((g) => g.dish_id === optionsDish.id)}
        />
      )}

      <section className="card p-5">
        <h2 className="section-title">Categorias</h2>

        {categories.length === 0 && (
          <p className="text-sm text-ink-muted">
            Ainda não há categorias — cria a primeira.
          </p>
        )}

        <ul>
          {categories.map((cat) => (
            <li key={cat.id} className="border-b border-line py-3 last:border-b-0">
              {editingCategory === cat.id ? (
                <CategoryForm
                  category={cat}
                  onDone={() => setEditingCategory(null)}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold">{cat.name}</span>
                  <span className="text-2xs text-ink-muted">
                    ordem {cat.sort_order}
                  </span>
                  <span className="label">
                    {cat.is_active ? "Visível" : "Oculta"}
                  </span>
                  <span className="ml-auto flex flex-wrap gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(cat.id);
                        setEditingDish(null);
                      }}
                      className="font-semibold underline underline-offset-4"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        confirm(`Remover a categoria «${cat.name}»?`) &&
                        run(deleteCategory(cat.id))
                      }
                      className="font-semibold text-danger underline underline-offset-4"
                    >
                      Remover
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>

        {editingCategory === "new" && (
          <div className="mt-3">
            <CategoryForm onDone={() => setEditingCategory(null)} />
          </div>
        )}
      </section>

      <section className="space-y-5">
        <h2 className="section-title">Pratos</h2>

        {categories.length === 0 && dishes.length === 0 && (
          <p className="text-sm text-ink-muted">
            Cria uma categoria e depois adiciona os pratos.
          </p>
        )}

        {categories.map((cat) => {
          const items = dishes.filter((dish) => dish.category_id === cat.id);
          return (
            <div key={cat.id} className="card p-5">
              <h3 className="mb-2 text-lg">{cat.name}</h3>
              {items.length === 0 ? (
                <p className="text-sm text-ink-muted">Sem pratos.</p>
              ) : (
                <ul>
                  {items.map((dish) => (
                    <DishRow
                      key={dish.id}
                      dish={dish}
                      onEdit={() => {
                        setEditingDish(dish);
                        setEditingCategory(null);
                        setEditingOptions(null);
                      }}
                      onOptions={() => {
                        setEditingOptions(dish);
                        setEditingDish(null);
                        setEditingCategory(null);
                      }}
                      onToggle={() =>
                        run(
                          setDishFlags(dish.id, { is_active: !dish.is_active }),
                        )
                      }
                      onSoldOut={() =>
                        run(
                          setDishFlags(dish.id, {
                            is_sold_out: !dish.is_sold_out,
                          }),
                        )
                      }
                      onDelete={() =>
                        confirm(`Remover o prato «${dish.name}»?`) &&
                        run(deleteDish(dish.id))
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {uncategorized.length > 0 && (
          <div className="card p-5">
            <h3 className="mb-2 text-lg">Sem categoria</h3>
            <ul>
              {uncategorized.map((dish) => (
                <DishRow
                  key={dish.id}
                  dish={dish}
                  onEdit={() => {
                    setEditingDish(dish);
                    setEditingCategory(null);
                    setEditingOptions(null);
                  }}
                  onOptions={() => {
                    setEditingOptions(dish);
                    setEditingDish(null);
                    setEditingCategory(null);
                  }}
                  onToggle={() =>
                    run(
                      setDishFlags(dish.id, { is_active: !dish.is_active }),
                    )
                  }
                  onSoldOut={() =>
                    run(
                      setDishFlags(dish.id, { is_sold_out: !dish.is_sold_out }),
                    )
                  }
                  onDelete={() =>
                    confirm(`Remover o prato «${dish.name}»?`) &&
                    run(deleteDish(dish.id))
                  }
                />
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}

function DishRow({
  dish,
  onEdit,
  onOptions,
  onToggle,
  onSoldOut,
  onDelete,
}: {
  dish: Dish;
  onEdit: () => void;
  onOptions: () => void;
  onToggle: () => void;
  onSoldOut: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-b-0">
      {dish.image_url ? (
        <Image
          src={dish.image_url}
          alt={dish.name}
          width={56}
          height={42}
          className="h-[42px] w-14 shrink-0 border border-line object-cover"
        />
      ) : (
        <span className="h-[42px] w-14 shrink-0 border border-dashed border-line" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{dish.name}</p>
        <p className="text-sm text-ink-muted">
          {formatEuro(dish.price)}
          {!dish.is_active && " · oculto"}
          {dish.is_sold_out && " · esgotado"}
        </p>
      </div>

      <span className="flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          onClick={onEdit}
          className="font-semibold underline underline-offset-4"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onOptions}
          className="font-semibold underline underline-offset-4"
        >
          Acompanhamentos
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="font-semibold underline underline-offset-4"
        >
          {dish.is_active ? "Ocultar" : "Mostrar"}
        </button>
        <button
          type="button"
          onClick={onSoldOut}
          className="font-semibold underline underline-offset-4"
        >
          {dish.is_sold_out ? "Repôr" : "Esgotar"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="font-semibold text-danger underline underline-offset-4"
        >
          Remover
        </button>
      </span>
    </li>
  );
}
