"use client";

import { useActionState } from "react";
import { saveSiteSettings } from "@/app/admin/settings-actions";
import type { SiteSettingsMap } from "@/lib/types";

const DAY_NAMES = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

export function SettingsForm({ settings }: { settings: SiteSettingsMap }) {
  const [state, action, pending] = useActionState(saveSiteSettings, {
    ok: false,
  });

  return (
    <form action={action} className="mt-6 space-y-6">
      {state.error && (
        <p
          role="alert"
          className="border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-bold text-danger"
        >
          {state.error}
        </p>
      )}
      {state.message && (
        <p
          role="status"
          className="border border-success/40 bg-success-soft px-4 py-3 text-sm font-bold text-success"
        >
          {state.message}
        </p>
      )}

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Identidade e contactos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <input
              name="brand_name"
              required
              maxLength={60}
              defaultValue={settings.brand_name}
              className="field-input"
            />
          </Field>
          <Field label="Telefone" hint="9 dígitos, sem indicativo">
            <input
              name="phone"
              required
              inputMode="numeric"
              maxLength={9}
              defaultValue={settings.phone}
              className="field-input"
            />
          </Field>
          <Field label="WhatsApp" hint="Com indicativo, para o link wa.me">
            <input
              name="whatsapp_number"
              required
              inputMode="numeric"
              maxLength={15}
              defaultValue={settings.whatsapp_number}
              className="field-input"
            />
          </Field>
          <Field label="Instagram" hint="Vazio esconde o botão">
            <input
              name="instagram_url"
              type="url"
              defaultValue={settings.instagram_url ?? ""}
              placeholder="https://instagram.com/..."
              className="field-input"
            />
          </Field>
        </div>
        <Field label="Aviso de recolha">
          <input
            name="pickup_only_notice"
            maxLength={160}
            defaultValue={settings.pickup_only_notice}
            className="field-input"
          />
        </Field>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Página inicial</h2>
        <Field label="Título">
          <input
            name="hero_title"
            required
            maxLength={120}
            defaultValue={settings.hero_title}
            className="field-input"
          />
        </Field>
        <Field label="Subtítulo">
          <input
            name="hero_subtitle"
            maxLength={200}
            defaultValue={settings.hero_subtitle}
            className="field-input"
          />
        </Field>
        <Field label="Título da história">
          <input
            name="story_title"
            maxLength={120}
            defaultValue={settings.story_title}
            className="field-input"
          />
        </Field>
        <Field label="Texto da história" hint="Parágrafos separados por linha vazia">
          <textarea
            name="story_text"
            rows={8}
            maxLength={4000}
            defaultValue={settings.story_text}
            className="field-input"
          />
        </Field>
        <Field
          label="Banner no topo"
          hint="Aviso temporário (ex.: encerrado por férias). Vazio = sem banner."
        >
          <textarea
            name="banner_message"
            rows={2}
            maxLength={300}
            defaultValue={settings.banner_message ?? ""}
            className="field-input"
          />
        </Field>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Horário e pedidos</h2>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="accepting_orders"
            defaultChecked={settings.accepting_orders}
            className="h-5 w-5 accent-accent"
          />
          <span className="font-semibold">Aceitar pedidos</span>
        </label>

        <fieldset className="space-y-2">
          <legend className="field-label">
            Horário por dia
            <span className="ml-1 font-normal text-ink-muted">
              (desmarca os dias fechados)
            </span>
          </legend>
          {DAY_NAMES.map((day, index) => {
            const dayHours = settings.opening_hours.schedule[index];
            return (
              <div key={day} className="flex flex-wrap items-center gap-2">
                <label className="flex w-28 items-center gap-2 text-sm capitalize">
                  <input
                    type="checkbox"
                    name="days"
                    value={index}
                    defaultChecked={dayHours !== null}
                    className="h-4 w-4 accent-accent"
                  />
                  {day}
                </label>
                <input
                  type="time"
                  name={`open_${index}`}
                  defaultValue={dayHours?.open ?? "17:00"}
                  aria-label={`Abertura de ${day}`}
                  className="field-input w-32"
                />
                <span className="text-sm text-ink-muted">às</span>
                <input
                  type="time"
                  name={`close_${index}`}
                  defaultValue={dayHours?.close ?? "21:00"}
                  aria-label={`Fecho de ${day}`}
                  className="field-input w-32"
                />
              </div>
            );
          })}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Intervalo de recolha (min)">
            <input
              name="pickup_slot_minutes"
              type="number"
              min={5}
              max={120}
              defaultValue={settings.pickup_slot_minutes}
              className="field-input"
            />
          </Field>
          <Field label="Antecedência mínima (min)">
            <input
              name="min_lead_time_minutes"
              type="number"
              min={0}
              max={1440}
              defaultValue={settings.min_lead_time_minutes}
              className="field-input"
            />
          </Field>
        </div>
      </section>

      <input type="hidden" name="payment_mode" defaultValue={settings.payment_mode} />
      <input
        type="hidden"
        name="mbway_payee"
        defaultValue={settings.mbway_payee ?? ""}
      />

      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "A guardar…" : "Guardar definições"}
        </button>
      </div>
    </form>
  );
}
