"use client";

import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => {};
}

/** Ano atual — no servidor devolve vazio, para o build poder pré-renderizar. */
export function CurrentYear() {
  const year = useSyncExternalStore(
    subscribe,
    () => String(new Date().getFullYear()),
    () => "",
  );

  return <span>{year}</span>;
}
