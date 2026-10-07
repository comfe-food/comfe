export const TIMEZONE = "Europe/Lisbon";

export interface ClockParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = domingo … 6 = sábado (mesma convenção do array `opening_hours.days`) */
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

export interface OpeningHoursLike {
  open: string;
  close: string;
  days: number[];
}

export interface OpenStateInput {
  accepting_orders: boolean;
  opening_hours: OpeningHoursLike;
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
  const { opening_hours: oh } = input;

  if (!oh.days.includes(p.weekday)) return { isOpen: false, reason: "closed_day" };

  const current = p.hour * 60 + p.minute;
  const open = minutesOfDay(oh.open);
  const close = minutesOfDay(oh.close);

  if (current < open || current >= close) {
    return { isOpen: false, reason: "outside_hours" };
  }
  return { isOpen: true, reason: "open" };
}

export interface SlotSettings {
  opening_hours: OpeningHoursLike;
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

  if (!oh.days.includes(p.weekday)) return [];

  const open = minutesOfDay(oh.open);
  const close = minutesOfDay(oh.close);
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
  if (!settings.opening_hours.days.includes(p.weekday)) return null;

  const minutes = p.hour * 60 + p.minute;
  const open = minutesOfDay(settings.opening_hours.open);
  const close = minutesOfDay(settings.opening_hours.close);
  if (minutes < open || minutes >= close) return null;

  const earliest =
    now.getTime() + Math.max(0, settings.min_lead_time_minutes || 0) * 60_000;
  if (date.getTime() < earliest) return null;

  const allowed = getPickupSlots(settings, now);
  const hhmm = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  if (!allowed.includes(hhmm)) return null;

  return date.toISOString();
}
