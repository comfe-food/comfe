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
import type { CartItem } from "@/components/cart/cart-context";

interface MenuUiValue {
  activeDish: MenuDish | null;
  /** Item do carrinho a editar (null = adicionar um novo). */
  editingItem: CartItem | null;
  openDish: (dish: MenuDish, editingItem?: CartItem | null) => void;
  closeDish: () => void;
}

const MenuUiContext = createContext<MenuUiValue | null>(null);

export function MenuUiProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<{
    dish: MenuDish;
    editingItem: CartItem | null;
  } | null>(null);

  const openDish = useCallback(
    (dish: MenuDish, editingItem: CartItem | null = null) =>
      setActive({ dish, editingItem }),
    [],
  );
  const closeDish = useCallback(() => setActive(null), []);

  const value = useMemo(
    () => ({
      activeDish: active?.dish ?? null,
      editingItem: active?.editingItem ?? null,
      openDish,
      closeDish,
    }),
    [active, openDish, closeDish],
  );

  return <MenuUiContext.Provider value={value}>{children}</MenuUiContext.Provider>;
}

export function useMenuUi(): MenuUiValue {
  const ctx = useContext(MenuUiContext);
  if (!ctx) throw new Error("useMenuUi tem de ser usado dentro de <MenuUiProvider>");
  return ctx;
}
