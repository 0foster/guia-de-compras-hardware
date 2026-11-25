/**
 * Motor de critérios: decide quais GPUs servem para o visitante, qual FPS
 * considerar, como cada placa se sai no monitor dele, em que ordem mostrar e
 * qual recomendar.
 *
 * Toda placa roda em toda resolução; o que importa é a experiência no monitor
 * do visitante (resolução + taxa de atualização) com o que ele joga. Por isso a
 * situação de cada placa é calculada pelos FPS medidos, não por opinião.
 *
 * É lógica pura (sem DOM): os filtros da home e o futuro assistente montam o
 * mesmo `Criteria` e usam estas funções.
 */
import type { Catalog, CatalogGpu } from './catalog';
import type { Resolution } from './games';
import { formatFps } from './format';

export const REFRESH_RATES = [60, 144, 240] as const;

/** Abaixo disso a placa "não atende" (fica travando). */
export const MIN_PLAYABLE_FPS = 50;
/** A partir de (taxa do monitor × isto) a placa "sobra desempenho". */
export const SURPLUS_FACTOR = 1.5;
/** Taxa usada quando o visitante escolhe a resolução mas não informa os Hz. */
export const DEFAULT_REFRESH_RATE = 60;

export type FitLevel = 'insufficient' | 'playable' | 'ideal' | 'surplus';

export const FIT_LABELS: Record<FitLevel, string> = {
  insufficient: 'Não atende',
  playable: 'Jogável',
  ideal: 'Aproveita o monitor',
  surplus: 'Sobra desempenho',
};

export const SORT_KEYS = ['fit', 'catalog', 'performance', 'efficiency', 'vram', 'power'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface Criteria {
  /** Resolução do monitor do visitante. */
  resolution?: Resolution;
  /** Taxa de atualização do monitor (Hz). */
  refreshRate?: number;
  /** Jogos que o visitante joga: o FPS considerado é a média deles. */
  games?: string[];
  /** Tipo de jogo: usado quando não há jogos escolhidos (média dos jogos do tipo). */
  category?: string;
  /** VRAM mínima em GB. */
  minVram?: number;
  /** Potência da fonte do visitante (W). */
  psuWatts?: number;
  /** Ordem. Padrão: "fit" com monitor escolhido; senão, ordem do catálogo. */
  sort?: SortKey;
}

export interface FpsMetric {
  value: number;
  resolution: Resolution;
  scope: 'games' | 'category' | 'average';
  /** Ex.: "Cyberpunk 2077", "média de 3 jogos escolhidos", "média de RPG", "média de 24 jogos". */
  label: string;
  /** Jogo mais pesado da seleção (quando a métrica é média de mais de um jogo escolhido ou de um tipo). */
  worst?: { name: string; value: number };
}

export interface Reason {
  key: 'monitor' | 'vram' | 'psu';
  ok: boolean;
  text: string;
}

export interface Evaluation {
  gpu: CatalogGpu;
  passes: boolean;
  metric: FpsMetric;
  /** Situação no monitor do visitante (só quando há monitor escolhido). */
  fit?: FitLevel;
  reasons: Reason[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Há monitor escolhido (resolução e/ou taxa de atualização)? */
export function hasMonitor(c: Criteria): boolean {
  return Boolean(c.resolution || c.refreshRate);
}

export function monitorRefreshRate(c: Criteria): number {
  return c.refreshRate ?? DEFAULT_REFRESH_RATE;
}

/** Resolução em que o FPS é medido: a do monitor ou, sem ela, a ideal da placa. */
export function metricResolution(gpu: CatalogGpu, c: Criteria): Resolution {
  return c.resolution ?? gpu.targetResolution[0];
}

export function classify(fps: number, refreshRate: number): FitLevel {
  if (fps < MIN_PLAYABLE_FPS) return 'insufficient';
  if (fps < refreshRate) return 'playable';
  if (fps < refreshRate * SURPLUS_FACTOR) return 'ideal';
  return 'surplus';
}

function averageOf(gpu: CatalogGpu, games: { slug: string; name: string }[], res: Resolution) {
  const values = games.map((g) => ({ name: g.name, value: gpu.gameFps[g.slug][res] }));
  const mean = values.reduce((sum, v) => sum + v.value, 0) / values.length;
  const worst = values.reduce((a, b) => (b.value < a.value ? b : a));
  return { mean: round1(mean), worst, count: values.length };
}

/** FPS de referência: jogos escolhidos (média) > tipo de jogo (média) > média geral. */
export function fpsMetric(gpu: CatalogGpu, c: Criteria, catalog: Catalog): FpsMetric {
  const resolution = metricResolution(gpu, c);

  const chosen = (c.games ?? [])
    .map((slug) => catalog.games.find((g) => g.slug === slug))
    .filter((g): g is NonNullable<typeof g> => Boolean(g && gpu.gameFps[g.slug]));
  if (chosen.length > 0) {
    const { mean, worst, count } = averageOf(gpu, chosen, resolution);
    return {
      value: mean,
      resolution,
      scope: 'games',
      label: count === 1 ? chosen[0].name : `média de ${count} jogos escolhidos`,
      ...(count > 1 ? { worst } : {}),
    };
  }

  const category = c.category ? catalog.categories.find((x) => x.slug === c.category) : undefined;
  if (category) {
    const inCategory = catalog.games.filter((g) => g.category === category.slug && gpu.gameFps[g.slug]);
    if (inCategory.length > 0) {
      const { mean, worst, count } = averageOf(gpu, inCategory, resolution);
      return {
        value: mean,
        resolution,
        scope: 'category',
        label: `média de ${category.name}`,
        ...(count > 1 ? { worst } : {}),
      };
    }
  }

  return { value: gpu.fps[resolution], resolution, scope: 'average', label: `média de ${catalog.games.length} jogos` };
}

export function evaluate(gpu: CatalogGpu, c: Criteria, catalog: Catalog): Evaluation {
  const metric = fpsMetric(gpu, c, catalog);
  const reasons: Reason[] = [];
  let fit: FitLevel | undefined;

  if (hasMonitor(c)) {
    const hz = monitorRefreshRate(c);
    fit = classify(metric.value, hz);
    reasons.push({
      key: 'monitor',
      ok: fit !== 'insufficient',
      text: `${FIT_LABELS[fit]}: ${metric.label} a ${formatFps(metric.value)} FPS em ${metric.resolution} (monitor de ${hz} Hz)`,
    });
  }

  if (c.minVram && c.minVram > 0) {
    reasons.push({ key: 'vram', ok: gpu.vram >= c.minVram, text: `${gpu.vram} GB de VRAM (mínimo ${c.minVram} GB)` });
  }

  if (c.psuWatts && c.psuWatts > 0) {
    reasons.push({
      key: 'psu',
      ok: gpu.recommendedPsu <= c.psuWatts,
      text: `Pede fonte de ${gpu.recommendedPsu} W (a sua: ${c.psuWatts} W)`,
    });
  }

  return { gpu, passes: reasons.every((r) => r.ok), metric, fit, reasons };
}

/** FPS por watt de consumo (TGP), na métrica escolhida. */
export function efficiency(e: Evaluation): number {
  return e.metric.value / e.gpu.tdp;
}

const FIT_RANK: Record<FitLevel, number> = { ideal: 0, surplus: 1, playable: 2, insufficient: 3 };

/**
 * "Mais adequada ao monitor": primeiro as que aproveitam (da mais simples para a
 * mais forte), depois as que sobram (idem), depois as jogáveis (da mais forte
 * para a mais fraca, ou seja, as mais perto de aproveitar primeiro).
 */
function byFit(a: Evaluation, b: Evaluation): number {
  const ra = FIT_RANK[a.fit ?? 'playable'];
  const rb = FIT_RANK[b.fit ?? 'playable'];
  if (ra !== rb) return ra - rb;
  return a.fit === 'playable' || a.fit === 'insufficient'
    ? b.metric.value - a.metric.value
    : a.metric.value - b.metric.value;
}

export function effectiveSort(c: Criteria): SortKey {
  return c.sort ?? (hasMonitor(c) ? 'fit' : 'catalog');
}

function sortEvaluations(list: Evaluation[], c: Criteria): Evaluation[] {
  const byPerf = (a: Evaluation, b: Evaluation) => b.metric.value - a.metric.value;
  const sorted = [...list];
  switch (effectiveSort(c)) {
    case 'fit':
      return hasMonitor(c) ? sorted.sort(byFit) : sorted;
    case 'performance':
      return sorted.sort(byPerf);
    case 'efficiency':
      return sorted.sort((a, b) => efficiency(b) - efficiency(a));
    case 'vram':
      return sorted.sort((a, b) => b.gpu.vram - a.gpu.vram || byPerf(a, b));
    case 'power':
      return sorted.sort((a, b) => a.gpu.tdp - b.gpu.tdp || byPerf(a, b));
    case 'catalog':
    default:
      return sorted; // ordem do catálogo (da mais simples para a mais forte)
  }
}

/** Avalia todas as GPUs (inclusive as que não passam), na ordem pedida. */
export function evaluateAll(catalog: Catalog, c: Criteria): Evaluation[] {
  return sortEvaluations(
    catalog.gpus.map((gpu) => evaluate(gpu, c, catalog)),
    c,
  );
}

/** Só as GPUs que atendem a todos os critérios, na ordem pedida. */
export function applyCriteria(catalog: Catalog, c: Criteria): Evaluation[] {
  return evaluateAll(catalog, c).filter((e) => e.passes);
}

export interface Recommendation {
  /** "recommended": a mais simples que aproveita o monitor. "closest": nenhuma aproveita; esta é a que chega mais perto. */
  kind: 'recommended' | 'closest';
  evaluation: Evaluation;
}

/** Placa recomendada entre as que passaram (só faz sentido com monitor escolhido). */
export function recommend(results: Evaluation[]): Recommendation | null {
  if (results.length === 0 || !results.some((e) => e.fit)) return null;
  const reaching = results.filter((e) => e.fit === 'ideal' || e.fit === 'surplus');
  if (reaching.length > 0) {
    const best = reaching.reduce((a, b) => (b.metric.value < a.metric.value ? b : a));
    return { kind: 'recommended', evaluation: best };
  }
  const closest = results.reduce((a, b) => (b.metric.value > a.metric.value ? b : a));
  return { kind: 'closest', evaluation: closest };
}
