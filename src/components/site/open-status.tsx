"use client";

import { useEffect, useState } from "react";
import { getOpenState } from "@/lib/business/hours";
import type { SiteSettingsMap } from "@/lib/types";
import { t } from "@/lib/static-config";

type Props = Pick<SiteSettingsMap, "accepting_orders" | "opening_hours">;

export function OpenStatus({ accepting_orders, opening_hours }: Props) {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () =>
      setOpen(getOpenState({ accepting_orders, opening_hours }).isOpen);
    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, [accepting_orders, opening_hours]);

  if (open === null) return null;

  return (
    <span
      className={`text-2xs font-bold uppercase tracking-wide ${
        open ? "text-success-soft" : "text-paper/80"
      }`}
      role="status"
    >
      {open ? t("openNow") : t("closedNow")}
    </span>
  );
}
