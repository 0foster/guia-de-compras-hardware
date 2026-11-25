/**
 * Lógica do comparativo de 2 ou 3 GPUs.
 *
 * Pura (sem DOM): recebe placas do catálogo e devolve as linhas da comparação
 * com o vencedor de cada linha, a diferença em % sobre a 1ª placa (a
 * "referência") e um veredito. Usada pela página /comparar no build e no
 * navegador.
 */
import type { Catalog, CatalogGpu } from './catalog';
import { RESOLUTIONS, type Resolution } from './games';
import { formatFps } from './format';

export const MIN_COMPARE = 2;
export const MAX_COMPARE = 3;
/** Comparação mostrada quando a URL não traz placas válidas suficientes. */
export const DEFAULT_COMPARE = ['rtx-5070', 'rtx-5070-ti'];

/** Qual valor é melhor numa linha. "none" = só informativo, ninguém vence. */
export type Better = 'higher' | 'lower' | 'none';

export interface CompareCell {
  slug: string;
  text: string;
  /** Valor numérico usado para vencedor/diferença (ausente em linhas de texto). */
  value?: number;
  isBest: boolean;
  /** Diferença em % sobre a 1ª placa; ausente na própria 1ª placa e em linhas de texto. */
  diffPct?: number;
}

export interface CompareRow {
  key: string;
  label: string;
  better: Better;
  cells: CompareCell[];
  /** Todas as placas têm o mesmo valor (some com "só diferenças"). */
  allEqual: boolean;
}

export interface CompareGroup {
  key: string;
  label: string;
  rows: CompareRow[];
}

interface RowDef {
  key: string;
  label: string;
  better: Better;
  value: (gpu: CatalogGpu) => number | string;
  format?: (gpu: CatalogGpu) => string;
}

const nf = (n: number) => n.toLocaleString('pt-BR');

const SPEC_GROUPS: { key: string; label: string; rows: RowDef[] }[] = [
  {
    key: 'memoria',
    label: 'Memória',
    rows: [
      { key: 'vram', label: 'VRAM', better: 'higher', value: (g) => g.vram, format: (g) => `${g.vram} GB ${g.vramType}` },
      { key: 'memoryBus', label: 'Barramento', better: 'higher', value: (g) => g.memoryBus, format: (g) => `${g.memoryBus}-bit` },
      { key: 'memoryBandwidth', label: 'Largura de banda', better: 'higher', value: (g) => g.memoryBandwidth, format: (g) => `${nf(g.memoryBandwidth)} GB/s` },
    ],
  },
  {
    key: 'desempenho',
    label: 'Desempenho',
    rows: [
      { key: 'cudaCores', label: 'CUDA cores', better: 'higher', value: (g) => g.cudaCores, format: (g) => nf(g.cudaCores) },
      { key: 'boostClock', label: 'Clock boost', better: 'higher', value: (g) => g.boostClock, format: (g) => `${g.boostClock} MHz` },
      { key: 'baseClock', label: 'Clock base', better: 'higher', value: (g) => g.baseClock, format: (g) => `${g.baseClock} MHz` },
    ],
  },
  {
    key: 'energia',
    label: 'Energia',
    rows: [
      { key: 'tdp', label: 'Consumo (TGP)', better: 'lower', value: (g) => g.tdp, format: (g) => `${g.tdp} W` },
      { key: 'recommendedPsu', label: 'Fonte recomendada', better: 'lower', value: (g) => g.recommendedPsu, format: (g) => `${g.recommendedPsu} W` },
    ],
  },
  {
    key: 'conectividade',
    label: 'Conectividade',
    rows: [
      { key: 'pciExpress', label: 'PCIe', better: 'none', value: (g) => g.pciExpress },
      { key: 'hdmi', label: 'HDMI', better: 'none', value: (g) => g.displayOutputs.hdmi },
      { key: 'displayPort', label: 'DisplayPort', better: 'none', value: (g) => g.displayOutputs.displayPort },
      { key: 'totalOutputs', label: 'Total de saídas', better: 'higher', value: (g) => g.displayOutputs.totalOutputs },
    ],
  },
];

export function diffPct(value: number, reference: number): number {
  return Math.round((value / reference - 1) * 100);
}

/** Monta uma linha: textos, vencedor(es) e diferença sobre a 1ª placa. */
export function buildRow(key: string, label: string, better: Better, gpus: CatalogGpu[], value: (g: CatalogGpu) => number | string, format?: (g: CatalogGpu) => string): CompareRow {
  const raw = gpus.map(value);
  const numeric = raw.every((v) => typeof v === 'number');
  const allEqual = raw.every((v) => v === raw[0]);

  let best: number | undefined;
  if (numeric && better !== 'none' && !allEqual) {
    const nums = raw as number[];
    best = better === 'higher' ? Math.max(...nums) : Math.min(...nums);
  }

  const cells: CompareCell[] = gpus.map((gpu, i) => {
    const v = raw[i];
    const cell: CompareCell = {
      slug: gpu.slug,
      text: format ? format(gpu) : String(v),
      isBest: best !== undefined && v === best,
    };
    if (typeof v === 'number') {
      cell.value = v;
      if (i > 0 && numeric) cell.diffPct = diffPct(v, raw[0] as number);
    }
    return cell;
  });

  return { key, label, better, cells, allEqual };
}

export function compareSpecs(gpus: CatalogGpu[]): CompareGroup[] {
  return SPEC_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    rows: group.rows.map((r) => buildRow(r.key, r.label, r.better, gpus, r.value, r.format)),
  }));
}

/** FPS médio dos 24 jogos, uma linha por resolução. */
export function compareAverageFps(gpus: CatalogGpu[]): CompareRow[] {
  return RESOLUTIONS.map((res) =>
    buildRow(`fps-${res}`, res, 'higher', gpus, (g) => g.fps[res], (g) => formatFps(g.fps[res])),
  );
}

/** FPS em cada jogo numa resolução, agrupado por tipo de jogo. */
export function compareGames(gpus: CatalogGpu[], catalog: Catalog, res: Resolution): CompareGroup[] {
  return catalog.categories
    .map((category) => ({
      key: category.slug,
      label: category.name,
      rows: catalog.games
        .filter((game) => game.category === category.slug && gpus.every((g) => g.gameFps[game.slug]))
        .map((game) =>
          buildRow(game.slug, game.name, 'higher', gpus, (g) => g.gameFps[game.slug][res], (g) => formatFps(g.gameFps[game.slug][res])),
        ),
    }))
    .filter((group) => group.rows.length > 0);
}

export interface Verdict {
  resolution: Resolution;
  fastest: { gpus: CatalogGpu[]; fps: number; slowest: CatalogGpu; pctOverSlowest: number } | null;
  leastPower: { gpus: CatalogGpu[]; tdp: number; psu: number } | null;
  mostVram: { gpus: CatalogGpu[]; vram: number } | null;
}

const ties = <T,>(gpus: CatalogGpu[], pick: (g: CatalogGpu) => T, target: T) => gpus.filter((g) => pick(g) === target);

export function verdict(gpus: CatalogGpu[], res: Resolution): Verdict {
  const fpsValues = gpus.map((g) => g.fps[res]);
  const maxFps = Math.max(...fpsValues);
  const minFps = Math.min(...fpsValues);
  const slowest = gpus[fpsValues.indexOf(minFps)];

  const tdps = gpus.map((g) => g.tdp);
  const minTdp = Math.min(...tdps);
  const vrams = gpus.map((g) => g.vram);
  const maxVram = Math.max(...vrams);

  return {
    resolution: res,
    fastest: maxFps === minFps ? null : { gpus: ties(gpus, (g) => g.fps[res], maxFps), fps: maxFps, slowest, pctOverSlowest: diffPct(maxFps, minFps) },
    leastPower: tdps.every((t) => t === minTdp)
      ? null
      : (() => {
          const winners = ties(gpus, (g) => g.tdp, minTdp);
          return { gpus: winners, tdp: minTdp, psu: Math.min(...winners.map((g) => g.recommendedPsu)) };
        })(),
    mostVram: vrams.every((v) => v === maxVram) ? null : { gpus: ties(gpus, (g) => g.vram, maxVram), vram: maxVram },
  };
}

const names = (gpus: CatalogGpu[]) => {
  const list = gpus.map((g) => g.shortName);
  return list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} e ${list.at(-1)}`;
};

/** Frases do veredito, prontas para exibir. */
export function verdictSentences(v: Verdict): string[] {
  const out: string[] = [];
  if (v.fastest) {
    out.push(`Mais rápida em ${v.resolution}: ${names(v.fastest.gpus)}, ${v.fastest.pctOverSlowest}% acima da ${v.fastest.slowest.shortName}.`);
  } else {
    out.push(`Desempenho igual em ${v.resolution}.`);
  }
  if (v.leastPower) {
    out.push(`Mais econômica: ${names(v.leastPower.gpus)} (${v.leastPower.tdp} W, fonte de ${v.leastPower.psu} W).`);
  }
  if (v.mostVram) {
    out.push(`Mais VRAM: ${names(v.mostVram.gpus)} (${v.mostVram.vram} GB).`);
  }
  return out;
}

/**
 * Lê a lista de placas da URL (`?gpus=a,b,c`): ignora slugs inválidos e
 * repetidos e limita a 3. Mantém a ordem pedida (a 1ª é a referência).
 */
export function parseCompareParam(param: string | null | undefined, catalog: Catalog): string[] {
  const valid = new Set(catalog.gpus.map((g) => g.slug));
  const out: string[] = [];
  for (const slug of (param ?? '').split(',').map((s) => s.trim())) {
    if (valid.has(slug) && !out.includes(slug)) out.push(slug);
    if (out.length === MAX_COMPARE) break;
  }
  return out;
}

export function compareUrl(slugs: string[]): string {
  return `/comparar?gpus=${slugs.slice(0, MAX_COMPARE).join(',')}`;
}

/** Placas escolhidas, com a comparação padrão quando a URL não traz pelo menos 2. */
export function resolveSelection(param: string | null | undefined, catalog: Catalog): CatalogGpu[] {
  const slugs = parseCompareParam(param, catalog);
  const chosen = slugs.length >= MIN_COMPARE ? slugs : DEFAULT_COMPARE;
  return chosen.map((slug) => catalog.gpus.find((g) => g.slug === slug)!).filter(Boolean);
}
