import { getAllergenDef } from "@/lib/static-config";

export function AllergenList({ codes }: { codes: string[] }) {
  if (codes.length === 0) {
    return <p className="text-xs text-ink-muted">Sem alergénios declarados.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
      {codes.map((code) => {
        const def = getAllergenDef(code);
        if (!def) return null;
        return <li key={code}>{def.name}</li>;
      })}
    </ul>
  );
}
