"use client";

import { useActionState, useEffect } from "react";
import { saveCategory } from "@/app/admin/menu-actions";
import type { Category, FormState } from "@/lib/types";

export function CategoryForm({
  category,
  onDone,
}: {
  category?: Category;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveCategory,
    { ok: false },
  );

  useEffect(() => {
    if (state.done) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-3 border-t border-line pt-3">
      {state.error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {state.error}
        </p>
      )}
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
        <label className="block">
          <span className="field-label">Nome</span>
          <input
            name="name"
            required
            maxLength={60}
            defaultValue={category?.name ?? ""}
            className="field-input"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="field-label">Ordem</span>
          <input
            name="sort_order"
            type="number"
            min={0}
            max={999}
            defaultValue={category?.sort_order ?? 0}
            className="field-input"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={category?.is_active ?? true}
          className="h-4 w-4 accent-accent"
        />
        Visível no site
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "A guardar…" : "Guardar"}
        </button>
        <button type="button" onClick={onDone} className="btn btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}
