import { describe, it, expect } from 'vitest';
import { buildCatalog } from './catalog';
import { getAllGpus, getAffiliateLinks } from './gpu';

const catalog = buildCatalog();

describe('buildCatalog', () => {
  it('includes every GPU in catalog order', () => {
    expect(catalog.gpus.map((g) => g.slug)).toEqual(getAllGpus().map((g) => g.slug));
  });

  it('carries the official specs and average FPS of each GPU', () => {
    const gpu = catalog.gpus.find((g) => g.slug === 'rtx-5070-ti')!;
    expect(gpu).toMatchObject({ vram: 16, tdp: 300, recommendedPsu: 750, cudaCores: 8960 });
    expect(gpu.fps).toEqual({ '1080p': 171.5, '1440p': 133.1, '4K': 79.5 });
    expect(gpu.targetResolution[0]).toBe('1440p');
  });

  it('has per-game FPS for all 24 games on every GPU', () => {
    for (const gpu of catalog.gpus) {
      expect(Object.keys(gpu.gameFps)).toHaveLength(24);
    }
    expect(catalog.gpus.find((g) => g.slug === 'rtx-5070')!.gameFps['counter-strike-2']).toEqual({
      '1080p': 428.0,
      '1440p': 298.8,
      '4K': 157.8,
    });
  });

  it('flags whether each GPU has a buy link', () => {
    for (const gpu of catalog.gpus) {
      const links = getAffiliateLinks(gpu.slug);
      expect(gpu.hasBuyLink).toBe(Boolean(links?.amazon || links?.mercadoLivre));
    }
    expect(catalog.gpus.find((g) => g.slug === 'rtx-5090')!.hasBuyLink).toBe(false);
    expect(catalog.gpus.find((g) => g.slug === 'rtx-5070')!.hasBuyLink).toBe(true);
  });

  it('lists games (without FPS) and categories', () => {
    expect(catalog.games).toHaveLength(24);
    expect(catalog.games[0]).not.toHaveProperty('fps');
    expect(catalog.categories.map((c) => c.slug)).toEqual(['tiro', 'rpg', 'acao-aventura', 'terror', 'corrida']);
  });

  it('is small enough to embed in the page as JSON', () => {
    const size = JSON.stringify(catalog).length;
    expect(size).toBeLessThan(40_000);
  });
});
