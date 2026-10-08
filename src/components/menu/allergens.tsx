import type { Allergen } from "@/lib/types";

export function AllergenList({
  codes,
  allergens,
}: {
  codes: string[];
  allergens: Allergen[];
}) {
  if (codes.length === 0) {
    return <p className="text-xs text-ink-muted">Sem alergénios declarados.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
      {codes.map((code) => {
        const name = allergens.find((a) => a.code === code)?.name_pt;
        if (!name) return null;
        return <li key={code}>{name}</li>;
      })}
    </ul>
  );
}
