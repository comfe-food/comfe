"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/admin/actions";
import {
  deleteOption,
  deleteOptionGroup,
  saveOption,
  saveOptionGroup,
} from "@/app/admin/menu-actions";
import { ActionMenu } from "@/components/admin/action-menu";
import { formatEuro } from "@/lib/format";
import type { Dish, FormState, Option } from "@/lib/types";
import type { AdminOptionGroup } from "@/lib/data/admin-menu";

export function OptionGroupsEditor({
  dish,
  groups,
}: {
  dish: Dish;
  groups: AdminOptionGroup[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | "new" | null>(null);
  const [addingOptionFor, setAddingOptionFor] = useState<string | null>(null);
  const [editingOption, setEditingOption] = useState<
    { id: string; groupId: string } | null
  >(null);

  async function run(action: Promise<ActionResult>) {
    const result = await action;
    if (!result.ok) setError(result.error ?? "Erro ao guardar.");
    router.refresh();
  }

  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title mb-0">Acompanhamentos</h2>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setEditingGroup("new");
            setAddingOptionFor(null);
            setEditingOption(null);
          }}
        >
          Novo grupo
        </button>
      </div>

      <p className="text-sm text-ink-muted">
        Grupos de opções de «{dish.name}» — ex.: Acompanhamento, Acrescentos.
      </p>

      {error && (
        <p
          role="alert"
          className="border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-bold text-danger"
        >
          {error}
        </p>
      )}

      {groups.length === 0 && editingGroup !== "new" && (
        <p className="text-sm text-ink-muted">
          Sem grupos — cria o primeiro para oferecer escolhas ao cliente.
        </p>
      )}

      <ul className="space-y-4">
        {groups.map((group) => {
          const isEditingGroup = editingGroup === group.id;
          return (
            <li key={group.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
              {isEditingGroup ? (
                <GroupForm
                  dishId={dish.id}
                  group={group}
                  onDone={() => setEditingGroup(null)}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold">{group.name}</span>
                  <span className="label">
                    {group.is_required || group.min_select > 0
                      ? "Obrigatório"
                      : "Opcional"}
                  </span>
                  <span className="text-2xs text-ink-muted">
                    {group.min_select}–{group.max_select} · ordem {group.sort_order}
                  </span>
                  <span className="ml-auto hidden flex-wrap gap-3 text-sm md:flex">
                    <button
                      type="button"
                      className="font-semibold"
                      onClick={() => {
                        setEditingGroup(group.id);
                        setAddingOptionFor(null);
                        setEditingOption(null);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="font-semibold text-danger"
                      onClick={() =>
                        confirm(`Remover o grupo «${group.name}» e as suas opções?`) &&
                        run(deleteOptionGroup(group.id))
                      }
                    >
                      Remover
                    </button>
                  </span>

                  <div className="ml-auto md:hidden">
                    <ActionMenu
                      ariaLabel={`Ações do grupo ${group.name}`}
                      items={[
                        {
                          label: "Editar",
                          onClick: () => {
                            setEditingGroup(group.id);
                            setAddingOptionFor(null);
                            setEditingOption(null);
                          },
                        },
                        {
                          label: "Remover",
                          danger: true,
                          onClick: () =>
                            confirm(
                              `Remover o grupo «${group.name}» e as suas opções?`,
                            ) && run(deleteOptionGroup(group.id)),
                        },
                      ]}
                    />
                  </div>
                </div>
              )}

              <ul className="mt-3 space-y-2 border-l-2 border-line pl-4">
                {group.options.map((opt) =>
                  editingOption?.id === opt.id ? (
                    <li key={opt.id}>
                      <OptionForm
                        groupId={group.id}
                        option={opt}
                        onDone={() => setEditingOption(null)}
                      />
                    </li>
                  ) : (
                    <li
                      key={opt.id}
                      className="flex flex-wrap items-center gap-3 text-sm"
                    >
                      <span className="font-semibold">{opt.name}</span>
                      <span className="text-ink-muted">
                        {Number(opt.extra_price) > 0
                          ? `+ ${formatEuro(opt.extra_price)}`
                          : "sem acréscimo"}
                      </span>
                      {!opt.is_active && <span className="label">Desativada</span>}
                      <span className="ml-auto hidden flex-wrap gap-3 md:flex">
                        <button
                          type="button"
                          className="font-semibold"
                          onClick={() => {
                            setEditingOption({ id: opt.id, groupId: group.id });
                            setEditingGroup(null);
                            setAddingOptionFor(null);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="font-semibold text-danger"
                          onClick={() =>
                            confirm(`Remover a opção «${opt.name}»?`) &&
                            run(deleteOption(opt.id))
                          }
                        >
                          Remover
                        </button>
                      </span>

                      <div className="ml-auto md:hidden">
                        <ActionMenu
                          ariaLabel={`Ações da opção ${opt.name}`}
                          items={[
                            {
                              label: "Editar",
                              onClick: () => {
                                setEditingOption({
                                  id: opt.id,
                                  groupId: group.id,
                                });
                                setEditingGroup(null);
                                setAddingOptionFor(null);
                              },
                            },
                            {
                              label: "Remover",
                              danger: true,
                              onClick: () =>
                                confirm(`Remover a opção «${opt.name}»?`) &&
                                run(deleteOption(opt.id)),
                            },
                          ]}
                        />
                      </div>
                    </li>
                  ),
                )}

                {group.options.length === 0 && (
                  <li className="text-sm text-ink-muted">Sem opções.</li>
                )}

                {addingOptionFor === group.id ? (
                  <li>
                    <OptionForm groupId={group.id} onDone={() => setAddingOptionFor(null)} />
                  </li>
                ) : (
                  <li>
                    <button
                      type="button"
                      className="text-sm font-semibold"
                      onClick={() => {
                        setAddingOptionFor(group.id);
                        setEditingGroup(null);
                        setEditingOption(null);
                      }}
                    >
                      + Nova opção
                    </button>
                  </li>
                )}
              </ul>
            </li>
          );
        })}
      </ul>

      {editingGroup === "new" && (
        <div className="border-t border-line pt-4">
          <GroupForm dishId={dish.id} onDone={() => setEditingGroup(null)} />
        </div>
      )}
    </section>
  );
}

function GroupForm({
  dishId,
  group,
  onDone,
}: {
  dishId: string;
  group?: AdminOptionGroup;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveOptionGroup,
    { ok: false },
  );

  useEffect(() => {
    if (state.done) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
        {group ? "Editar grupo" : "Novo grupo"}
      </h3>
      {state.error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {state.error}
        </p>
      )}
      <input type="hidden" name="id" value={group?.id ?? ""} />
      <input type="hidden" name="dish_id" value={dishId} />

      <div className="grid gap-3 sm:grid-cols-[1fr_5rem_5rem_5rem]">
        <label className="block">
          <span className="field-label">Nome</span>
          <input
            name="name"
            required
            maxLength={60}
            defaultValue={group?.name ?? ""}
            placeholder="Acompanhamento"
            className="field-input"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="field-label">Mín.</span>
          <input
            name="min_select"
            type="number"
            min={0}
            max={20}
            defaultValue={group?.min_select ?? 0}
            className="field-input"
          />
        </label>
        <label className="block">
          <span className="field-label">Máx.</span>
          <input
            name="max_select"
            type="number"
            min={1}
            max={20}
            defaultValue={group?.max_select ?? 1}
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
            defaultValue={group?.sort_order ?? 0}
            className="field-input"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="is_required"
            defaultChecked={group?.is_required ?? false}
            className="h-4 w-4 accent-accent"
          />
          Obrigatório escolher
        </label>
        <span className="flex flex-wrap gap-3">
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "A guardar…" : "Guardar"}
          </button>
          <button type="button" onClick={onDone} className="btn btn-secondary">
            Cancelar
          </button>
        </span>
      </div>
    </form>
  );
}

function OptionForm({
  groupId,
  option,
  onDone,
}: {
  groupId: string;
  option?: Option;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveOption,
    { ok: false },
  );

  useEffect(() => {
    if (state.done) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-3 border border-line p-3">
      <h4 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
        {option ? "Editar opção" : "Nova opção"}
      </h4>
      {state.error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {state.error}
        </p>
      )}
      <input type="hidden" name="id" value={option?.id ?? ""} />
      <input type="hidden" name="group_id" value={groupId} />

      <div className="grid gap-3 sm:grid-cols-[1fr_7rem_5rem_5rem]">
        <label className="block">
          <span className="field-label">Nome</span>
          <input
            name="name"
            required
            maxLength={60}
            defaultValue={option?.name ?? ""}
            placeholder="Batata frita"
            className="field-input"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="field-label">Acréscimo (€)</span>
          <input
            name="extra_price"
            type="number"
            step="0.05"
            min={0}
            max={999}
            defaultValue={option ? Number(option.extra_price) : 0}
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
            defaultValue={option?.sort_order ?? 0}
            className="field-input"
          />
        </label>
        <label className="flex items-end gap-2 pb-3 text-sm font-semibold">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={option?.is_active ?? true}
            className="h-4 w-4 accent-accent"
          />
          Ativa
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
