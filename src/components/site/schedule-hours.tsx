"use client";

import { useEffect, useState } from "react";
import {
  getOpenState,
  lisbonParts,
  WEEKDAYS_PT_SHORT,
} from "@/lib/business/hours";
import type { OpeningHours } from "@/lib/types";
import { t } from "@/lib/static-config";

/**
 * Mostra apenas o horário de hoje e esconde a semana completa num dropdown.
 * O dia de hoje é calculado no cliente (fuso Europe/Lisbon) para não ficar
 * preso ao momento em que a página foi gerada.
 */
export function ScheduleHours({
  opening_hours,
  accepting_orders = true,
  className,
  tone = "default",
}: {
  opening_hours: OpeningHours;
  accepting_orders?: boolean;
  className?: string;
  tone?: "default" | "inverse";
}) {
  const [weekday, setWeekday] = useState<number | null>(null);
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => {
      setWeekday(lisbonParts().weekday);
      setOpen(getOpenState({ accepting_orders, opening_hours }).isOpen);
    };
    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, [accepting_orders, opening_hours]);

  const inverse = tone === "inverse";
  const today = weekday === null ? null : opening_hours.schedule[weekday];
  const hasHours = opening_hours.schedule.some(Boolean);

  const box = inverse
    ? "rounded-[var(--radius-base)] border border-paper/20 px-4 py-3"
    : "card px-4 py-3";

  const dot =
    open === true
      ? inverse
        ? "bg-success-soft"
        : "bg-success"
      : inverse
        ? "bg-paper/40"
        : "bg-ink-muted/40";

  const label = inverse ? "text-paper/70" : "text-ink-muted";
  const hoursText = inverse ? "text-paper" : "text-ink";
  const rowMuted = inverse ? "text-paper/80" : "text-ink-muted";
  const rowToday = inverse ? "text-paper" : "text-accent";
  const divider = inverse ? "border-paper/15" : "border-line";
  const summaryText = inverse
    ? "text-paper/70 hover:text-paper"
    : "text-ink-muted hover:text-accent";

  return (
    <div className={`${box} ${className ?? ""}`}>
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${dot}`}
          aria-hidden="true"
        />
        <span
          className={`text-2xs font-bold uppercase tracking-wide ${label}`}
        >
          {weekday === null
            ? t("today")
            : `${t("today")} · ${WEEKDAYS_PT_SHORT[weekday]}`}
        </span>
        <span
          className={`ml-auto font-display text-lg tabular-nums ${hoursText}`}
        >
          {today ? `${today.open}–${today.close}` : t("closed")}
        </span>
      </div>

      {weekday !== null && (
        <span className="sr-only">
          {open ? t("openNow") : t("closedNow")}
        </span>
      )}

      {hasHours && (
        <details className={`group mt-2 border-t pt-2 ${divider}`}>
          <summary
            className={`flex cursor-pointer list-none items-center justify-between text-2xs font-bold uppercase tracking-wide ${summaryText} [&::-webkit-details-marker]:hidden`}
          >
            {t("allDays")}
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
            >
              <path d="M5 7l5 5 5-5" />
            </svg>
          </summary>
          <dl className="mt-2 space-y-1 text-sm">
            {opening_hours.schedule.map((day, i) => {
              const isToday = i === weekday;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-4 ${
                    isToday ? `font-semibold ${rowToday}` : rowMuted
                  }`}
                >
                  <dt>{WEEKDAYS_PT_SHORT[i]}</dt>
                  <dd className="tabular-nums">
                    {day ? `${day.open}–${day.close}` : t("closed")}
                  </dd>
                </div>
              );
            })}
          </dl>
        </details>
      )}
    </div>
  );
}
