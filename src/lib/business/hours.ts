import type { DaySchedule, OpeningHours } from "@/lib/types";

export const TIMEZONE = "Europe/Lisbon";

export interface ClockParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = domingo … 6 = sábado (índice de `opening_hours.schedule`) */
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function parts(date: Date): ClockParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = p.value;
  }
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    weekday: WEEKDAY_INDEX[out.weekday] ?? 0,
  };
}

export function lisbonParts(date: Date = new Date()): ClockParts {
  return parts(date);
}

export function toISODate(p: ClockParts): string {
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function minutesOfDay(hour: string): number {
  const [h, m] = hour.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const WEEKDAYS_PT = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** Abreviaturas para apresentações compactas (calendário, rodapé). */
export const WEEKDAYS_PT_SHORT = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
];

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  schedule: Array.from({ length: 7 }, () => ({ open: "17:00", close: "21:00" })),
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeDay(value: unknown): DaySchedule | null {
  if (!value || typeof value !== "object") return null;
  const { open, close } = value as { open?: unknown; close?: unknown };
  if (
    typeof open === "string" &&
    typeof close === "string" &&
    TIME_RE.test(open) &&
    TIME_RE.test(close)
  ) {
    return { open, close };
  }
  return null;
}

/**
 * Aceita o formato atual (`{ schedule: [...] }`) e o antigo
 * (`{ open, close, days: number[] }`) e devolve sempre o formato atual.
 */
export function normalizeOpeningHours(value: unknown): OpeningHours {
  if (value && typeof value === "object") {
    const obj = value as {
      schedule?: unknown;
      open?: unknown;
      close?: unknown;
      days?: unknown;
    };
    if (Array.isArray(obj.schedule)) {
      const raw = obj.schedule as unknown[];
      return {
        schedule: Array.from({ length: 7 }, (_, i) => normalizeDay(raw[i])),
      };
    }
    if (
      typeof obj.open === "string" &&
      typeof obj.close === "string" &&
      Array.isArray(obj.days)
    ) {
      const day: DaySchedule = { open: obj.open, close: obj.close };
      const openDays = obj.days as unknown[];
      return {
        schedule: Array.from({ length: 7 }, (_, i) =>
          openDays.includes(i) ? { ...day } : null,
        ),
      };
    }
  }
  return DEFAULT_OPENING_HOURS;
}

export interface ScheduledRange {
  days: number[];
  open: string;
  close: string;
}

/** Agrupa dias consecutivos com o mesmo horário, para apresentação. */
export function groupSchedule(oh: OpeningHours): ScheduledRange[] {
  const groups: ScheduledRange[] = [];
  oh.schedule.forEach((day, index) => {
    if (!day) return;
    const last = groups[groups.length - 1];
    if (last && last.open === day.open && last.close === day.close) {
      last.days.push(index);
    } else {
      groups.push({ days: [index], open: day.open, close: day.close });
    }
  });
  return groups;
}

/** Linhas legíveis do horário (ex.: "Todos os dias: 17:00–21:00"). */
export function formatScheduleLines(
  oh: OpeningHours,
  dayNames: string[] = WEEKDAYS_PT,
): string[] {
  return groupSchedule(oh).map((g) => {
    const label =
      g.days.length === 7
        ? "Todos os dias"
        : g.days.map((d) => dayNames[d]).join(", ");
    return `${label}: ${g.open}–${g.close}`;
  });
}

export interface OpenStateInput {
  accepting_orders: boolean;
  opening_hours: OpeningHours;
}

export interface OpenState {
  isOpen: boolean;
  reason: "open" | "switched_off" | "closed_day" | "outside_hours";
}

/** Calcula se o site está a aceitar pedidos agora, no fuso Europe/Lisbon. */
export function getOpenState(
  input: OpenStateInput,
  now: Date = new Date(),
): OpenState {
  if (!input.accepting_orders) return { isOpen: false, reason: "switched_off" };

  const p = parts(now);
  const today = input.opening_hours.schedule[p.weekday];
  if (!today) return { isOpen: false, reason: "closed_day" };

  const current = p.hour * 60 + p.minute;
  const open = minutesOfDay(today.open);
  const close = minutesOfDay(today.close);

  if (current < open || current >= close) {
    return { isOpen: false, reason: "outside_hours" };
  }
  return { isOpen: true, reason: "open" };
}

export interface SlotSettings {
  opening_hours: OpeningHours;
  pickup_slot_minutes: number;
  min_lead_time_minutes: number;
}

/**
 * Intervalos de recolha disponíveis para hoje, em HH:MM, já filtrados para
 * excluir o que está no passado ou demasiado perto (antecedência mínima).
 */
export function getPickupSlots(
  settings: SlotSettings,
  now: Date = new Date(),
): string[] {
  const p = parts(now);
  const { opening_hours: oh, pickup_slot_minutes, min_lead_time_minutes } = settings;

  const today = oh.schedule[p.weekday];
  if (!today) return [];

  const open = minutesOfDay(today.open);
  const close = minutesOfDay(today.close);
  const step = Math.max(5, pickup_slot_minutes || 15);
  const earliest = p.hour * 60 + p.minute + Math.max(0, min_lead_time_minutes || 0);

  const slots: string[] = [];
  for (let t = open; t + step <= close; t += step) {
    if (t < earliest) continue;
    slots.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return slots;
}

/**
 * Converte um slot "HH:MM" de hoje para um timestamp ISO no fuso do servidor.
 * A validação final é sempre feita no servidor com `Europe/Lisbon`.
 */
export function slotToISO(slot: string, now: Date = new Date()): string | null {
  const p = parts(now);
  const [h, m] = slot.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;

  // Constrói o instante a partir do fuso Europe/Lisbon e devolve o UTC equivalente.
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, h, m, 0);
  const offset = getLisbonOffsetMinutes(now);
  return new Date(asUTC - offset * 60_000).toISOString();
}

function getLisbonOffsetMinutes(date: Date): number {
  const p = parts(date);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);
  return Math.round((asUTC - date.getTime()) / 60_000);
}

/** Valida uma hora de recolha vinda do cliente. Devolve o ISO ou null. */
export function validatePickupTime(
  isoValue: string,
  settings: SlotSettings,
  now: Date = new Date(),
): string | null {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getTime() <= now.getTime()) return null;

  const p = parts(date);
  const today = settings.opening_hours.schedule[p.weekday];
  if (!today) return null;

  const minutes = p.hour * 60 + p.minute;
  const open = minutesOfDay(today.open);
  const close = minutesOfDay(today.close);
  if (minutes < open || minutes >= close) return null;

  const earliest =
    now.getTime() + Math.max(0, settings.min_lead_time_minutes || 0) * 60_000;
  if (date.getTime() < earliest) return null;

  const allowed = getPickupSlots(settings, now);
  const hhmm = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  if (!allowed.includes(hhmm)) return null;

  return date.toISOString();
}
