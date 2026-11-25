/**
 * Conversão entre critérios e endereço da página (query string), e descrição
 * dos filtros ativos em etiquetas.
 *
 * Permite compartilhar uma busca por link e é por aqui que o futuro assistente
 * vai entregar o resultado: ele monta um `Criteria` e manda o visitante para
 * `/?<criteriaToQuery(criteria)>`.
 */
import type { Catalog } from './catalog';
import { RESOLUTIONS, type Resolution } from './games';
import { REFRESH_RATES, SORT_KEYS, type Criteria, type SortKey } from './criteria';

/** Nomes curtos dos parâmetros, em português, para links legíveis. */
export const PARAMS = {
  resolution: 'res',
  refreshRate: 'hz',
  games: 'jogos',
  category: 'tipo',
  minVram: 'vram',
  psuWatts: 'fonte',
  sort: 'ordem',
} as const;

/** Parâmetros de versões anteriores do site, aceitos para não quebrar links antigos. */
const LEGACY = { game: 'jogo', minFps: 'fps' } as const;

const positiveInt = (raw: string | null): number | undefined => {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

/** Critérios → query string (sem o "?"). Valores padrão ficam de fora. */
export function criteriaToQuery(c: Criteria): string {
  const p = new URLSearchParams();
  if (c.resolution) p.set(PARAMS.resolution, c.resolution);
  if (c.refreshRate) p.set(PARAMS.refreshRate, String(c.refreshRate));
  if (c.games?.length) p.set(PARAMS.games, c.games.join(','));
  if (c.category) p.set(PARAMS.category, c.category);
  if (c.minVram) p.set(PARAMS.minVram, String(c.minVram));
  if (c.psuWatts) p.set(PARAMS.psuWatts, String(c.psuWatts));
  if (c.sort) p.set(PARAMS.sort, c.sort);
  return p.toString().replace(/%2C/g, ',');
}

/**
 * Query string → critérios. Ignora valores inválidos (jogo/tipo inexistente,
 * resolução desconhecida, Hz fora de 60/144/240, ordenação inválida).
 */
export function queryToCriteria(search: string | URLSearchParams, catalog: Catalog): Criteria {
  const p = typeof search === 'string' ? new URLSearchParams(search) : search;
  const c: Criteria = {};

  // Versões antigas aceitavam várias resoluções separadas por vírgula: vale a primeira válida.
  const resolution = (p.get(PARAMS.resolution) ?? '').split(',').find((r) => RESOLUTIONS.includes(r as Resolution));
  if (resolution) c.resolution = resolution as Resolution;

  const hz = positiveInt(p.get(PARAMS.refreshRate)) ?? positiveInt(p.get(LEGACY.minFps));
  if (hz && (REFRESH_RATES as readonly number[]).includes(hz)) c.refreshRate = hz;

  const validGames = new Set(catalog.games.map((g) => g.slug));
  const games = [...(p.get(PARAMS.games) ?? '').split(','), p.get(LEGACY.game) ?? '']
    .map((s) => s.trim())
    .filter((s, i, arr) => validGames.has(s) && arr.indexOf(s) === i);
  if (games.length) c.games = games;

  const category = p.get(PARAMS.category);
  if (category && catalog.categories.some((cat) => cat.slug === category)) c.category = category;

  const vram = positiveInt(p.get(PARAMS.minVram));
  if (vram) c.minVram = vram;

  const psu = positiveInt(p.get(PARAMS.psuWatts));
  if (psu) c.psuWatts = psu;

  const sort = p.get(PARAMS.sort);
  if (sort && (SORT_KEYS as readonly string[]).includes(sort)) c.sort = sort as SortKey;

  return c;
}

export interface ActiveFilter {
  /** Identifica o que remover: "res", "hz", "jogo:<slug>", "tipo", "vram", "fonte". */
  key: string;
  label: string;
}

/** Etiquetas dos filtros ativos (a ordenação não vira etiqueta). */
export function describeCriteria(c: Criteria, catalog: Catalog): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  if (c.resolution) out.push({ key: 'res', label: `Monitor ${c.resolution}` });
  if (c.refreshRate) out.push({ key: 'hz', label: `${c.refreshRate} Hz` });
  for (const slug of c.games ?? []) {
    const game = catalog.games.find((g) => g.slug === slug);
    if (game) out.push({ key: `jogo:${slug}`, label: game.name });
  }
  if (c.category) {
    const cat = catalog.categories.find((x) => x.slug === c.category);
    if (cat) out.push({ key: 'tipo', label: cat.name });
  }
  if (c.minVram) out.push({ key: 'vram', label: `${c.minVram} GB+ de VRAM` });
  if (c.psuWatts) out.push({ key: 'fonte', label: `Fonte de ${c.psuWatts} W` });
  return out;
}

/** Remove um filtro (pela chave da etiqueta) e devolve os critérios novos. */
export function removeFilter(c: Criteria, key: string): Criteria {
  const next: Criteria = { ...c };
  if (key.startsWith('jogo:')) {
    const slug = key.slice(5);
    next.games = (c.games ?? []).filter((g) => g !== slug);
    if (next.games.length === 0) delete next.games;
  } else if (key === 'res') delete next.resolution;
  else if (key === 'hz') delete next.refreshRate;
  else if (key === 'tipo') delete next.category;
  else if (key === 'vram') delete next.minVram;
  else if (key === 'fonte') delete next.psuWatts;
  return next;
}
