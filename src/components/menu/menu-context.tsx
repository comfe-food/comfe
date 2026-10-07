"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MenuDish } from "@/lib/data/menu";

interface MenuUiValue {
  activeDish: MenuDish | null;
  openDish: (dish: MenuDish) => void;
  closeDish: () => void;
}

const MenuUiContext = createContext<MenuUiValue | null>(null);

export function MenuUiProvider({ children }: { children: ReactNode }) {
  const [activeDish, setActiveDish] = useState<MenuDish | null>(null);

  const openDish = useCallback((dish: MenuDish) => setActiveDish(dish), []);
  const closeDish = useCallback(() => setActiveDish(null), []);

  const value = useMemo(
    () => ({ activeDish, openDish, closeDish }),
    [activeDish, openDish, closeDish],
  );

  return <MenuUiContext.Provider value={value}>{children}</MenuUiContext.Provider>;
}

export function useMenuUi(): MenuUiValue {
  const ctx = useContext(MenuUiContext);
  if (!ctx) throw new Error("useMenuUi tem de ser usado dentro de <MenuUiProvider>");
  return ctx;
}
