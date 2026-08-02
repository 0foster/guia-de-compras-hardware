import { describe, it, expect } from 'vitest';
import { getAllGpus, getGpuBySlug, getAffiliateLinks } from './gpu';

describe('getAllGpus', () => {
  it('returns an array of GPUs', () => {
    const gpus = getAllGpus();
    expect(Array.isArray(gpus)).toBe(true);
    expect(gpus.length).toBeGreaterThan(0);
  });

  it('returns exactly 7 RTX 50-series GPUs', () => {
    const gpus = getAllGpus();
    expect(gpus).toHaveLength(7);
  });

  it('every GPU has required fields', () => {
    const gpus = getAllGpus();
    for (const gpu of gpus) {
      expect(gpu.slug).toBeDefined();
      expect(gpu.name).toBeDefined();
      expect(gpu.shortName).toBeDefined();
      expect(gpu.vram).toBeGreaterThan(0);
      expect(gpu.targetResolution).toBeDefined();
      expect(Array.isArray(gpu.targetResolution)).toBe(true);
      expect(gpu.fps).toBeDefined();
      expect(gpu.fps['1080p']).toBeDefined();
      expect(gpu.fps['1440p']).toBeDefined();
      expect(gpu.fps['4K']).toBeDefined();
      expect(gpu.metaDescription).toBeDefined();
      expect(gpu.aiSummary).toBeDefined();
    }
  });

  it('GPUs are in ascending performance order', () => {
    const gpus = getAllGpus();
    for (let i = 1; i < gpus.length; i++) {
      expect(gpus[i].performanceTier).toBeGreaterThanOrEqual(
        gpus[i - 1].performanceTier,
      );
    }
  });

  it('every GPU has valid adjacentGpus references', () => {
    const gpus = getAllGpus();
    const slugs = new Set(gpus.map((g) => g.slug));

    for (const gpu of gpus) {
      if (gpu.adjacentGpus.stepDown) {
        expect(slugs.has(gpu.adjacentGpus.stepDown)).toBe(true);
      }
      if (gpu.adjacentGpus.stepUp) {
        expect(slugs.has(gpu.adjacentGpus.stepUp)).toBe(true);
      }
    }
  });
});

describe('getGpuBySlug', () => {
  it('returns the correct GPU for a valid slug', () => {
    const gpu = getGpuBySlug('rtx-5070');
    expect(gpu).toBeDefined();
    expect(gpu?.shortName).toBe('RTX 5070');
  });

  it('returns undefined for an invalid slug', () => {
    const gpu = getGpuBySlug('rtx-9999');
    expect(gpu).toBeUndefined();
  });

  it('finds every GPU by its slug', () => {
    const gpus = getAllGpus();
    for (const gpu of gpus) {
      const found = getGpuBySlug(gpu.slug);
      expect(found).toBeDefined();
      expect(found?.name).toBe(gpu.name);
    }
  });
});

describe('getAffiliateLinks', () => {
  it('returns affiliate data for a valid slug', () => {
    const links = getAffiliateLinks('rtx-5070');
    expect(links).toBeDefined();
    expect(links?.priceRange).toBeDefined();
    expect(links?.priceRange.min).toBeGreaterThan(0);
    expect(links?.priceRange.max).toBeGreaterThanOrEqual(links!.priceRange.min);
  });

  it('returns undefined for an invalid slug', () => {
    const links = getAffiliateLinks('rtx-9999');
    expect(links).toBeUndefined();
  });

  it('every GPU has corresponding affiliate links', () => {
    const gpus = getAllGpus();
    for (const gpu of gpus) {
      const links = getAffiliateLinks(gpu.slug);
      expect(links).toBeDefined();
      expect(links?.amazon).toBeDefined();
      expect(links?.mercadoLivre).toBeDefined();
    }
  });

  it('affiliate links have amazon and mercadoLivre entries with required fields', () => {
    const links = getAffiliateLinks('rtx-5080');
    expect(links?.amazon.url).toBeDefined();
    expect(links?.amazon.displayPrice).toBeGreaterThan(0);
    expect(links?.amazon.sellerNote).toBeDefined();
    expect(links?.mercadoLivre.url).toBeDefined();
    expect(links?.mercadoLivre.displayPrice).toBeGreaterThan(0);
  });
});
