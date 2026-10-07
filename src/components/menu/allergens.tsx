import { getAllergenDef } from "@/lib/static-config";

export function AllergenBadge({ code }: { code: string }) {
  const def = getAllergenDef(code);
  if (!def) return null;
  return (
    <span
      className="text-base leading-none"
      title={def.name}
      aria-label={def.name}
      role="img"
    >
      {def.icon}
    </span>
  );
}

export function AllergenList({ codes }: { codes: string[] }) {
  if (codes.length === 0) {
    return (
      <p className="text-xs text-indigo-light">Sem alergénios declarados.</p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
      {codes.map((code) => {
        const def = getAllergenDef(code);
        if (!def) return null;
        return (
          <li key={code} className="flex items-center gap-1.5 text-xs font-semibold">
            <span aria-hidden="true">{def.icon}</span>
            {def.name}
          </li>
        );
      })}
    </ul>
  );
}

export function AllergenIcons({ codes }: { codes: string[] }) {
  if (codes.length === 0) return null;
  return (
    <span className="flex items-center gap-1" aria-label="Alergénios presentes">
      {codes.map((code) => (
        <AllergenBadge key={code} code={code} />
      ))}
    </span>
  );
}
