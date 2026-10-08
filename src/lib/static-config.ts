import staticConfig from "@/config/static.json";

export type AllergenCode =
  | "gluten"
  | "crustaceans"
  | "eggs"
  | "fish"
  | "peanuts"
  | "soy"
  | "milk"
  | "nuts"
  | "celery"
  | "mustard"
  | "sesame"
  | "sulphites"
  | "lupin"
  | "molluscs";

export interface AllergenDef {
  code: AllergenCode;
  name: string;
  icon: string;
}

export interface StaticConfig {
  allergens: AllergenDef[];
  texts: Record<string, string>;
  steps: { number: number; title: string; text: string }[];
  seo: {
    brandName: string;
    defaultTitle: string;
    defaultDescription: string;
    keywords: string[];
    allergenNotice: string;
  };
  design: {
    fontDisplay: string;
    fontBody: string;
    minTapTarget: number;
  };
}

let cached: StaticConfig | null = null;

export function getStaticConfig(): StaticConfig {
  if (!cached) {
    cached = staticConfig as StaticConfig;
  }
  return cached;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let value = getStaticConfig().texts[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replaceAll(`{${k}}`, String(v));
    }
  }
  return value;
}
