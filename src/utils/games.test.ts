import { describe, it, expect } from 'vitest';
import { getAllGpus } from './gpu';
import { getCategories, getGames, getGameFpsByCategory, gameSource, RESOLUTIONS } from './games';

describe('games data', () => {
  it('has the 24 games of the TechPowerUp suite', () => {
    expect(getGames()).toHaveLength(24);
    const slugs = getGames().map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every game belongs to a known category', () => {
    const categorySlugs = new Set(getCategories().map((c) => c.slug));
    for (const game of getGames()) {
      expect(categorySlugs.has(game.category)).toBe(true);
    }
  });

  it('every game has FPS for every GPU at every resolution', () => {
    for (const game of getGames()) {
      for (const gpu of getAllGpus()) {
        for (const res of RESOLUTIONS) {
          expect(game.fps[gpu.slug]?.[res], `${game.slug} / ${gpu.slug} / ${res}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('the average across the 24 games matches the published average FPS of each GPU', () => {
    // Conferência de leitura: o FPS médio do TechPowerUp é a média aritmética dos 24 jogos.
    for (const gpu of getAllGpus()) {
      for (const res of RESOLUTIONS) {
        const values = getGames().map((g) => g.fps[gpu.slug][res]);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        expect(Math.round(mean * 10) / 10, `${gpu.slug} ${res}`).toBe(gpu.fps[res].avg);
      }
    }
  });

  it('cites both TechPowerUp reviews and which GPUs each covers', () => {
    expect(gameSource.reviews).toHaveLength(2);
    const covered = gameSource.reviews.flatMap((r) => r.covers).sort();
    expect(covered).toEqual(getAllGpus().map((g) => g.slug).sort());
  });
});

describe('getGameFpsByCategory', () => {
  it('groups all games of a GPU by category, in category order', () => {
    const groups = getGameFpsByCategory('rtx-5070');
    expect(groups.map((g) => g.category.slug)).toEqual(getCategories().map((c) => c.slug));
    expect(groups.reduce((n, g) => n + g.games.length, 0)).toBe(24);
  });

  it('returns the right FPS for a known value', () => {
    const shooters = getGameFpsByCategory('rtx-5070').find((g) => g.category.slug === 'tiro');
    const cs2 = shooters?.games.find((g) => g.slug === 'counter-strike-2');
    expect(cs2?.fps).toEqual({ '1080p': 428.0, '1440p': 298.8, '4K': 157.8 });
  });

  it('returns nothing for an unknown GPU', () => {
    expect(getGameFpsByCategory('rtx-9999')).toEqual([]);
  });
});
