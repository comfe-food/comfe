"use client";

import { useEffect, useState } from "react";
import { formatScheduleLines, lisbonParts } from "@/lib/business/hours";
import type { OpeningHours } from "@/lib/types";

/**
 * Mostra apenas o horário de hoje e esconde a semana completa num dropdown.
 * O dia de hoje é calculado no cliente (fuso Europe/Lisbon) para não ficar
 * preso ao momento em que a página foi gerada.
 */
export function ScheduleHours({
  opening_hours,
  className,
  tone = "default",
}: {
  opening_hours: OpeningHours;
  className?: string;
  tone?: "default" | "inverse";
}) {
  const [weekday, setWeekday] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setWeekday(lisbonParts().weekday);
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const today = weekday === null ? null : opening_hours.schedule[weekday];
  const days = formatScheduleLines(opening_hours);

  const muted = tone === "inverse" ? "text-paper/80" : "text-ink-muted";
  const hover = tone === "inverse" ? "hover:text-paper" : "hover:text-accent";

  return (
    <div className={className}>
      <p className="text-sm font-semibold">
        {weekday === null
          ? "\u00A0"
          : today
            ? `Hoje: ${today.open}–${today.close}`
            : "Hoje: fechado"}
      </p>
      {days.length > 0 && (
        <details className="mt-1">
          <summary className={`cursor-pointer text-sm ${muted} ${hover}`}>
            Ver todos os dias
          </summary>
          <ul className={`mt-2 space-y-0.5 text-sm ${muted}`}>
            {days.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
