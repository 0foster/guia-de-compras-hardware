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
import { FPS_TARGETS, SORT_KEYS, type Criteria, type SortKey } from './criteria';

/** Nomes curtos dos parâmetros, em português, para links legíveis. */
export const PARAMS = {
  resolutions: 'res',
  minVram: 'vram',
  game: 'jogo',
  category: 'tipo',
  minFps: 'fps',
  psuWatts: 'fonte',
  sort: 'ordem',
} as const;

const positiveInt = (raw: string | null): number | undefined => {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

/** Critérios → query string (sem o "?"). Valores padrão ficam de fora. */
export function criteriaToQuery(c: Criteria): string {
  const p = new URLSearchParams();
  if (c.resolutions?.length) p.set(PARAMS.resolutions, c.resolutions.join(','));
  if (c.game) p.set(PARAMS.game, c.game);
  if (c.category) p.set(PARAMS.category, c.category);
  if (c.minFps) p.set(PARAMS.minFps, String(c.minFps));
  if (c.minVram) p.set(PARAMS.minVram, String(c.minVram));
  if (c.psuWatts) p.set(PARAMS.psuWatts, String(c.psuWatts));
  if (c.sort && c.sort !== 'catalog') p.set(PARAMS.sort, c.sort);
  return p.toString().replace(/%2C/g, ',');
}

/**
 * Query string → critérios. Ignora valores inválidos (jogo/tipo inexistente,
 * resolução desconhecida, meta de FPS fora de 60/144/240, ordenação inválida).
 */
export function queryToCriteria(search: string | URLSearchParams, catalog: Catalog): Criteria {
  const p = typeof search === 'string' ? new URLSearchParams(search) : search;
  const c: Criteria = {};

  const resolutions = (p.get(PARAMS.resolutions) ?? '')
    .split(',')
    .filter((r): r is Resolution => RESOLUTIONS.includes(r as Resolution));
  if (resolutions.length) c.resolutions = [...new Set(resolutions)];

  const game = p.get(PARAMS.game);
  if (game && catalog.games.some((g) => g.slug === game)) c.game = game;

  const category = p.get(PARAMS.category);
  if (category && catalog.categories.some((cat) => cat.slug === category)) c.category = category;

  const fps = positiveInt(p.get(PARAMS.minFps));
  if (fps && (FPS_TARGETS as readonly number[]).includes(fps)) c.minFps = fps;

  const vram = positiveInt(p.get(PARAMS.minVram));
  if (vram) c.minVram = vram;

  const psu = positiveInt(p.get(PARAMS.psuWatts));
  if (psu) c.psuWatts = psu;

  const sort = p.get(PARAMS.sort);
  if (sort && (SORT_KEYS as readonly string[]).includes(sort)) c.sort = sort as SortKey;

  return c;
}

export interface ActiveFilter {
  /** Identifica o que remover: "res:1440p", "jogo", "tipo", "fps", "vram", "fonte". */
  key: string;
  label: string;
}

/** Etiquetas dos filtros ativos (a ordenação não vira etiqueta). */
export function describeCriteria(c: Criteria, catalog: Catalog): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  for (const res of c.resolutions ?? []) out.push({ key: `res:${res}`, label: res });
  if (c.game) {
    const game = catalog.games.find((g) => g.slug === c.game);
    if (game) out.push({ key: 'jogo', label: game.name });
  }
  if (c.category) {
    const cat = catalog.categories.find((x) => x.slug === c.category);
    if (cat) out.push({ key: 'tipo', label: cat.name });
  }
  if (c.minFps) out.push({ key: 'fps', label: `${c.minFps}+ FPS` });
  if (c.minVram) out.push({ key: 'vram', label: `${c.minVram} GB+ de VRAM` });
  if (c.psuWatts) out.push({ key: 'fonte', label: `Fonte de ${c.psuWatts} W` });
  return out;
}

/** Remove um filtro (pela chave da etiqueta) e devolve os critérios novos. */
export function removeFilter(c: Criteria, key: string): Criteria {
  const next: Criteria = { ...c };
  if (key.startsWith('res:')) {
    const res = key.slice(4);
    next.resolutions = (c.resolutions ?? []).filter((r) => r !== res);
  } else if (key === 'jogo') delete next.game;
  else if (key === 'tipo') delete next.category;
  else if (key === 'fps') delete next.minFps;
  else if (key === 'vram') delete next.minVram;
  else if (key === 'fonte') delete next.psuWatts;
  return next;
}
