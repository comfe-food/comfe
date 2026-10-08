"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { saveDish } from "@/app/admin/menu-actions";
import type { Allergen, Category, Dish, FormState } from "@/lib/types";

export function DishForm({
  dish,
  categories,
  allergens,
  onDone,
}: {
  dish?: Dish;
  categories: Category[];
  allergens: Allergen[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveDish,
    { ok: false },
  );
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    if (state.done) onDone();
  }, [state, onDone]);

  const imageUrl = removeImage ? null : dish?.image_url ?? null;

  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="section-title">{dish ? "Editar prato" : "Novo prato"}</h2>

      {state.error && (
        <p
          role="alert"
          className="border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-bold text-danger"
        >
          {state.error}
        </p>
      )}

      <input type="hidden" name="id" value={dish?.id ?? ""} />
      <input
        type="hidden"
        name="image_url"
        value={removeImage ? "" : dish?.image_url ?? ""}
      />

      <label className="block">
        <span className="field-label">Nome</span>
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={dish?.name ?? ""}
          className="field-input"
          autoFocus
        />
      </label>

      <label className="block">
        <span className="field-label">Descrição</span>
        <textarea
          name="description"
          rows={2}
          maxLength={400}
          defaultValue={dish?.description ?? ""}
          className="field-input"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-4">
        <label className="block">
          <span className="field-label">Preço (€)</span>
          <input
            name="price"
            type="number"
            step="0.05"
            min="0"
            max="999"
            required
            defaultValue={dish ? Number(dish.price) : ""}
            className="field-input"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="field-label">Categoria</span>
          <select
            name="category_id"
            defaultValue={dish?.category_id ?? ""}
            className="field-input"
          >
            <option value="">Sem categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
                {cat.is_active ? "" : " (oculta)"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Ordem</span>
          <input
            name="sort_order"
            type="number"
            min={0}
            max={9999}
            defaultValue={dish?.sort_order ?? 0}
            className="field-input"
          />
        </label>
      </div>

      <div>
        <span className="field-label">Foto</span>
        <div className="flex flex-wrap items-center gap-4">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={dish?.name ?? "Foto do prato"}
              width={96}
              height={72}
              className="h-[72px] w-24 border border-line object-cover"
            />
          ) : (
            <span className="flex h-[72px] w-24 items-center justify-center border border-dashed border-line text-2xs text-ink-muted">
              Sem foto
            </span>
          )}
          <div className="flex flex-col gap-2">
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="text-sm"
            />
            {dish?.image_url && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={removeImage}
                  onChange={(e) => setRemoveImage(e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                Remover foto
              </label>
            )}
          </div>
        </div>
      </div>

      <fieldset>
        <legend className="field-label">Alergénios</legend>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {allergens.map((allergen) => (
            <label
              key={allergen.code}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                name="allergens"
                value={allergen.code}
                defaultChecked={dish?.allergens.includes(allergen.code)}
                className="h-4 w-4 accent-accent"
              />
              {allergen.name_pt}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Disponível desde</span>
          <input
            name="available_from"
            type="date"
            defaultValue={dish?.available_from ?? ""}
            className="field-input"
          />
        </label>
        <label className="block">
          <span className="field-label">Disponível até</span>
          <input
            name="available_until"
            type="date"
            defaultValue={dish?.available_until ?? ""}
            className="field-input"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={dish?.is_active ?? true}
            className="h-4 w-4 accent-accent"
          />
          Visível no site
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="is_sold_out"
            defaultChecked={dish?.is_sold_out ?? false}
            className="h-4 w-4 accent-accent"
          />
          Esgotado
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "A guardar…" : "Guardar prato"}
        </button>
        <button type="button" onClick={onDone} className="btn btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}
