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

  if (open === null) {
    return <span className="chip opacity-70" aria-hidden="true">·</span>;
  }

  return (
    <span
      className={`chip min-h-[32px] ${
        open ? "bg-success-soft text-success" : "bg-cream/20 text-cream"
      }`}
      role="status"
    >
      <span
        aria-hidden="true"
        className={`inline-block h-2 w-2 rounded-full ${
          open ? "bg-success" : "bg-cream/60"
        }`}
      />
      {open ? t("openNow") : t("closedNow")}
    </span>
  );
}
