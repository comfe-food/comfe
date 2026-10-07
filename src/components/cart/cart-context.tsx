"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface CartOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  extraPrice: number;
}

export interface CartItem {
  id: string;
  dishId: string;
  name: string;
  imageUrl: string | null;
  basePrice: number;
  quantity: number;
  options: CartOption[];
  notes: string;
}

const STORAGE_KEY = "comfe:cart:v1";
const EMPTY: CartItem[] = [];

let snapshot: CartItem[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readStorage(): CartItem[] {
  if (hydrated) return snapshot;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) {
        snapshot = parsed.filter((i) => i && typeof i.dishId === "string");
      }
    }
  } catch {
    // storage corrompido ou indisponível — carrinho vazio
  }
  return snapshot;
}

function getSnapshot(): CartItem[] {
  return readStorage();
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function commit(next: CartItem[]) {
  snapshot = next;
  hydrated = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // modo privado / quota — mantém só em memória
  }
  for (const listener of listeners) listener();
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c${Date.now()}${Math.random().toString(16).slice(2)}`;
}

export function unitPrice(item: CartItem): number {
  return item.basePrice + item.options.reduce((s, o) => s + o.extraPrice, 0);
}

export interface CartApi {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "id" | "quantity">, quantity: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

/** Estado do carrinho (localStorage), sem provider e sem efeitos. */
export function useCart(): CartApi {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback(
    (item: Omit<CartItem, "id" | "quantity">, quantity: number) => {
      const qty = Math.max(1, Math.min(99, Math.floor(quantity) || 1));
      const prev = readStorage();

      const sameSignature = (a: CartItem) =>
        a.dishId === item.dishId &&
        a.notes === item.notes &&
        a.options.length === item.options.length &&
        a.options.every((o, i) => o.optionId === item.options[i]?.optionId);

      const existing = prev.find(sameSignature);
      commit(
        existing
          ? prev.map((a) =>
              a.id === existing.id
                ? { ...a, quantity: Math.min(99, a.quantity + qty) }
                : a,
            )
          : [...prev, { ...item, id: makeId(), quantity: qty }],
      );
    },
    [],
  );

  const setQuantity = useCallback((id: string, quantity: number) => {
    const qty = Math.max(0, Math.min(99, Math.floor(quantity) || 0));
    const prev = readStorage();
    commit(
      qty === 0
        ? prev.filter((a) => a.id !== id)
        : prev.map((a) => (a.id === id ? { ...a, quantity: qty } : a)),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    commit(readStorage().filter((a) => a.id !== id));
  }, []);

  const clear = useCallback(() => commit(EMPTY), []);

  let count = 0;
  let subtotal = 0;
  for (const item of items) {
    count += item.quantity;
    subtotal += unitPrice(item) * item.quantity;
  }

  return { items, count, subtotal, addItem, setQuantity, removeItem, clear };
}
