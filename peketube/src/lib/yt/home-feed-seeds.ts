import type { HomeFeedChipId } from "@/lib/yt/home-chips";

export type HomeFeedSeedPack = {
  cartoons: readonly string[];
  music: readonly string[];
};

/** Consultas genéricas por idioma (YouTube + regionCode sesgan resultados). */
export const HOME_FEED_SEEDS_BY_LANGUAGE: Record<string, HomeFeedSeedPack> = {
  es: {
    cartoons: [
      "dibujos animados infantiles",
      "series infantiles populares",
      "caricaturas para niños",
      "dibujos animados en español",
      "cuentos infantiles animados",
      "programas infantiles animados",
      "videos educativos infantiles dibujos",
      "dibujos para niños en español",
    ],
    music: [
      "canciones infantiles",
      "musica para niños",
      "canciones para niños en español",
      "musica infantil para bailar",
      "canciones de la granja infantiles",
      "nursery rhymes español",
      "musica infantil español",
    ],
  },
  en: {
    cartoons: [
      "kids cartoons popular",
      "cartoons for kids",
      "popular kids shows",
      "animated shows for kids",
      "kids tv shows",
      "preschool cartoons",
      "kids animation full episodes",
      "family friendly cartoons",
    ],
    music: [
      "kids songs",
      "nursery rhymes",
      "kids music",
      "songs for children",
      "children songs popular",
      "toddler songs",
      "kids dance songs",
    ],
  },
  pt: {
    cartoons: [
      "desenhos animados infantil",
      "desenhos para crianças",
      "séries infantis animadas",
      "desenhos animados em português",
      "histórias infantis animadas",
    ],
    music: [
      "música infantil",
      "canções infantis",
      "música para crianças",
      "cantigas infantis",
    ],
  },
};

/** País → idioma de las consultas de descubrimiento (sin marcas fijas). */
export const REGION_TO_QUERY_LANGUAGE: Record<string, string> = {
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  VE: "es",
  EC: "es",
  UY: "es",
  PY: "es",
  BO: "es",
  CR: "es",
  PA: "es",
  DO: "es",
  GT: "es",
  HN: "es",
  NI: "es",
  SV: "es",
  PR: "es",
  US: "en",
  GB: "en",
  CA: "en",
  AU: "en",
  NZ: "en",
  IE: "en",
  BR: "pt",
  PT: "pt",
};

const FALLBACK_LANGUAGE = "es";

const FALLBACK_PACK: HomeFeedSeedPack =
  HOME_FEED_SEEDS_BY_LANGUAGE[FALLBACK_LANGUAGE]!;

/** Idioma de consultas para un código de región ISO (p. ej. ES, MX, US). */
export function queryLanguageForRegion(regionCode: string): string {
  const code = regionCode.trim().toUpperCase();
  return REGION_TO_QUERY_LANGUAGE[code] ?? FALLBACK_LANGUAGE;
}

export function homeFeedSeedPack(regionCode: string): HomeFeedSeedPack {
  const lang = queryLanguageForRegion(regionCode);
  return HOME_FEED_SEEDS_BY_LANGUAGE[lang] ?? FALLBACK_PACK;
}

/** Lista de consultas para un chip (sin duplicados). */
export function getHomeSeedQueries(
  chipId: HomeFeedChipId,
  regionCode: string,
): string[] {
  const pack = homeFeedSeedPack(regionCode);
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (q: string) => {
    const key = q.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(q.trim());
  };
  if (chipId === "cartoons") {
    for (const q of pack.cartoons) push(q);
  } else if (chipId === "music") {
    for (const q of pack.music) push(q);
  } else {
    for (const q of pack.cartoons) push(q);
    for (const q of pack.music) push(q);
  }
  return out;
}
