"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/admin/actions";
import { deleteAllergen, saveAllergen } from "@/app/admin/menu-actions";
import { ActionMenu } from "@/components/admin/action-menu";
import type { Allergen, FormState } from "@/lib/types";

export function AllergensEditor({ allergens }: { allergens: Allergen[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);

  async function run(action: Promise<ActionResult>) {
    const result = await action;
    if (!result.ok) setError(result.error ?? "Erro ao guardar.");
    router.refresh();
  }

  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title mb-0">Alergénios</h2>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setEditing("new")}
        >
          Novo alergénio
        </button>
      </div>

      <p className="text-sm text-ink-muted">
        Lista usada nos pratos e no site público. O código identifica o
        alergénio — se o alterares, os pratos são atualizados.
      </p>

      {error && (
        <p
          role="alert"
          className="border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-bold text-danger"
        >
          {error}
        </p>
      )}

      {editing === "new" && (
        <AllergenForm onDone={() => setEditing(null)} />
      )}

      <ul>
        {allergens.map((a) => (
          <li key={a.code} className="border-b border-line py-3 last:border-b-0">
            {editing === a.code ? (
              <AllergenForm allergen={a} onDone={() => setEditing(null)} />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">{a.name_pt}</span>
                <span className="label">{a.code}</span>
                <span className="text-2xs text-ink-muted">
                  ordem {a.sort_order}
                </span>
                <span className="ml-auto hidden flex-wrap gap-3 text-sm md:flex">
                  <button
                    type="button"
                    className="font-semibold underline underline-offset-4"
                    onClick={() => setEditing(a.code)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="font-semibold text-danger underline underline-offset-4"
                    onClick={() =>
                      confirm(`Remover o alergénio «${a.name_pt}»?`) &&
                      run(deleteAllergen(a.code))
                    }
                  >
                    Remover
                  </button>
                </span>

                <div className="ml-auto md:hidden">
                  <ActionMenu
                    ariaLabel={`Ações do alergénio ${a.name_pt}`}
                    items={[
                      { label: "Editar", onClick: () => setEditing(a.code) },
                      {
                        label: "Remover",
                        danger: true,
                        onClick: () =>
                          confirm(`Remover o alergénio «${a.name_pt}»?`) &&
                          run(deleteAllergen(a.code)),
                      },
                    ]}
                  />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AllergenForm({
  allergen,
  onDone,
}: {
  allergen?: Allergen;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveAllergen,
    { ok: false },
  );

  useEffect(() => {
    if (state.done) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-3">
      {state.error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {state.error}
        </p>
      )}
      <input type="hidden" name="original_code" value={allergen?.code ?? ""} />

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_6rem]">
        <label className="block">
          <span className="field-label">Nome</span>
          <input
            name="name_pt"
            required
            maxLength={60}
            defaultValue={allergen?.name_pt ?? ""}
            className="field-input"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="field-label">Código</span>
          <input
            name="code"
            required
            maxLength={40}
            pattern="[a-z0-9-]{2,40}"
            defaultValue={allergen?.code ?? ""}
            placeholder="gluten"
            className="field-input"
          />
        </label>
        <label className="block">
          <span className="field-label">Ordem</span>
          <input
            name="sort_order"
            type="number"
            min={0}
            max={999}
            defaultValue={allergen?.sort_order ?? 0}
            className="field-input"
          />
        </label>
      </div>

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
