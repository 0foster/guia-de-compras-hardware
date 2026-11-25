/**
 * Motor de critérios: decide quais GPUs atendem a um conjunto de critérios,
 * qual FPS mostrar para cada uma, em que ordem e por quê.
 *
 * É lógica pura (sem DOM): os filtros da home montam um `Criteria` a partir dos
 * controles, e o futuro assistente vai montar o mesmo `Criteria` a partir das
 * respostas. Os dois usam estas funções.
 */
import type { Catalog, CatalogGpu } from './catalog';
import type { Resolution } from './games';
import { formatFps } from './format';

export const FPS_TARGETS = [60, 144, 240] as const;

export const SORT_KEYS = ['catalog', 'performance', 'efficiency', 'vram', 'power'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface Criteria {
  /** Resoluções indicadas: a placa passa se for indicada para alguma delas. */
  resolutions?: Resolution[];
  /** VRAM mínima em GB. */
  minVram?: number;
  /** Slug do jogo: o FPS passa a ser medido nesse jogo. */
  game?: string;
  /** Slug do tipo de jogo: o FPS passa a ser a média dos jogos desse tipo. */
  category?: string;
  /** Meta de FPS: o FPS medido precisa chegar a esse valor. */
  minFps?: number;
  /** Potência da fonte do visitante (W): a fonte recomendada precisa caber nela. */
  psuWatts?: number;
  sort?: SortKey;
}

export interface FpsMetric {
  value: number;
  resolution: Resolution;
  scope: 'game' | 'category' | 'average';
  /** Ex.: "Cyberpunk 2077", "média de RPG", "média de 24 jogos". */
  label: string;
}

export interface Reason {
  key: 'resolution' | 'vram' | 'fps' | 'psu';
  ok: boolean;
  text: string;
}

export interface Evaluation {
  gpu: CatalogGpu;
  passes: boolean;
  metric: FpsMetric;
  reasons: Reason[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Resolução em que o FPS é medido: a escolhida, se o visitante marcou exatamente
 * uma; senão, a resolução ideal da placa.
 */
export function metricResolution(gpu: CatalogGpu, criteria: Criteria): Resolution {
  const chosen = criteria.resolutions ?? [];
  return chosen.length === 1 ? chosen[0] : gpu.targetResolution[0];
}

/** FPS a mostrar/avaliar: jogo escolhido > média do tipo de jogo > média geral. */
export function fpsMetric(gpu: CatalogGpu, criteria: Criteria, catalog: Catalog): FpsMetric {
  const resolution = metricResolution(gpu, criteria);

  const game = criteria.game ? catalog.games.find((g) => g.slug === criteria.game) : undefined;
  if (game && gpu.gameFps[game.slug]) {
    return { value: gpu.gameFps[game.slug][resolution], resolution, scope: 'game', label: game.name };
  }

  const category = criteria.category ? catalog.categories.find((c) => c.slug === criteria.category) : undefined;
  if (category) {
    const values = catalog.games
      .filter((g) => g.category === category.slug && gpu.gameFps[g.slug])
      .map((g) => gpu.gameFps[g.slug][resolution]);
    if (values.length > 0) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return { value: round1(mean), resolution, scope: 'category', label: `média de ${category.name}` };
    }
  }

  return {
    value: gpu.fps[resolution],
    resolution,
    scope: 'average',
    label: `média de ${catalog.games.length} jogos`,
  };
}

export function evaluate(gpu: CatalogGpu, criteria: Criteria, catalog: Catalog): Evaluation {
  const metric = fpsMetric(gpu, criteria, catalog);
  const reasons: Reason[] = [];

  const resolutions = criteria.resolutions ?? [];
  if (resolutions.length > 0) {
    const ok = resolutions.some((r) => gpu.targetResolution.includes(r));
    reasons.push({
      key: 'resolution',
      ok,
      text: `Indicada para ${gpu.targetResolution.join(' e ')}`,
    });
  }

  if (criteria.minVram && criteria.minVram > 0) {
    reasons.push({
      key: 'vram',
      ok: gpu.vram >= criteria.minVram,
      text: `${gpu.vram} GB de VRAM (mínimo ${criteria.minVram} GB)`,
    });
  }

  if (criteria.minFps && criteria.minFps > 0) {
    reasons.push({
      key: 'fps',
      ok: metric.value >= criteria.minFps,
      text: `${metric.label} em ${metric.resolution}: ${formatFps(metric.value)} FPS (meta ${criteria.minFps})`,
    });
  }

  if (criteria.psuWatts && criteria.psuWatts > 0) {
    reasons.push({
      key: 'psu',
      ok: gpu.recommendedPsu <= criteria.psuWatts,
      text: `Pede fonte de ${gpu.recommendedPsu} W (a sua: ${criteria.psuWatts} W)`,
    });
  }

  return { gpu, passes: reasons.every((r) => r.ok), metric, reasons };
}

/** FPS por watt de consumo (TGP), na métrica escolhida. */
export function efficiency(e: Evaluation): number {
  return e.metric.value / e.gpu.tdp;
}

function sortEvaluations(list: Evaluation[], sort: SortKey = 'catalog'): Evaluation[] {
  const byPerf = (a: Evaluation, b: Evaluation) => b.metric.value - a.metric.value;
  const sorted = [...list];
  switch (sort) {
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
export function evaluateAll(catalog: Catalog, criteria: Criteria): Evaluation[] {
  return sortEvaluations(
    catalog.gpus.map((gpu) => evaluate(gpu, criteria, catalog)),
    criteria.sort,
  );
}

/** Só as GPUs que atendem a todos os critérios, na ordem pedida. */
export function applyCriteria(catalog: Catalog, criteria: Criteria): Evaluation[] {
  return evaluateAll(catalog, criteria).filter((e) => e.passes);
}
