/**
 * Catálogo unificado das GPUs.
 *
 * Junta, num formato só e serializável, tudo o que os filtros da home, o
 * comparativo e o futuro assistente precisam de cada placa: especificações,
 * FPS médio, FPS por jogo e se há link de compra. É gerado no build e pode ser
 * embutido na página como JSON para uso no navegador.
 */
import { getAllGpus, getAffiliateLinks } from './gpu';
import { getCategories, getGames, RESOLUTIONS, type FpsByResolution, type GameCategory, type Resolution } from './games';

export interface CatalogGpu {
  slug: string;
  name: string;
  shortName: string;
  /** 1 (entrada) a 5 (topo). A ordem do catálogo segue esta escala. */
  performanceTier: number;
  /** Resoluções indicadas para a placa; a primeira é a "ideal". */
  targetResolution: Resolution[];
  vram: number;
  vramType: string;
  /** Total Graphics Power (W). */
  tdp: number;
  /** Fonte mínima recomendada pela NVIDIA (W). */
  recommendedPsu: number;
  cudaCores: number;
  baseClock: number;
  boostClock: number;
  memoryBus: number;
  memoryBandwidth: number;
  pciExpress: string;
  displayOutputs: { hdmi: string; displayPort: string; totalOutputs: number };
  /** FPS médio dos 24 jogos, por resolução. */
  fps: FpsByResolution;
  /** FPS por jogo (slug do jogo → FPS por resolução). */
  gameFps: Record<string, FpsByResolution>;
  /** Há pelo menos um link de compra (Amazon ou Mercado Livre). */
  hasBuyLink: boolean;
  inStock: boolean;
}

export interface CatalogGame {
  slug: string;
  name: string;
  category: string;
}

export interface Catalog {
  gpus: CatalogGpu[];
  games: CatalogGame[];
  categories: GameCategory[];
}

function pickFps(fps: Record<string, { avg: number }>): FpsByResolution {
  return Object.fromEntries(RESOLUTIONS.map((res) => [res, fps[res].avg])) as FpsByResolution;
}

export function buildCatalog(): Catalog {
  const games = getGames();

  const gpus: CatalogGpu[] = getAllGpus().map((gpu) => {
    const links = getAffiliateLinks(gpu.slug);
    return {
      slug: gpu.slug,
      name: gpu.name,
      shortName: gpu.shortName,
      performanceTier: gpu.performanceTier,
      targetResolution: gpu.targetResolution as Resolution[],
      vram: gpu.vram,
      vramType: gpu.vramType,
      tdp: gpu.tdp,
      recommendedPsu: gpu.recommendedPsu,
      cudaCores: gpu.cudaCores,
      baseClock: gpu.baseClock,
      boostClock: gpu.boostClock,
      memoryBus: gpu.memoryBus,
      memoryBandwidth: gpu.memoryBandwidth,
      pciExpress: gpu.pciExpress,
      displayOutputs: gpu.displayOutputs,
      fps: pickFps(gpu.fps),
      gameFps: Object.fromEntries(
        games.filter((g) => g.fps[gpu.slug]).map((g) => [g.slug, g.fps[gpu.slug]]),
      ),
      hasBuyLink: Boolean(links?.amazon || links?.mercadoLivre),
      inStock: gpu.inStock,
    };
  });

  return {
    gpus,
    games: games.map(({ slug, name, category }) => ({ slug, name, category })),
    categories: getCategories(),
  };
}
