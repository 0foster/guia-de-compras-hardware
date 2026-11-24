import { describe, it, expect } from 'vitest';
import { getAllGpus, getGpuBySlug, getAffiliateLinks } from './gpu';
import gpuData from '../data/gpus.json';

describe('getAllGpus', () => {
  it('returns an array of GPUs', () => {
    const gpus = getAllGpus();
    expect(Array.isArray(gpus)).toBe(true);
    expect(gpus.length).toBeGreaterThan(0);
  });

  it('returns the 8 RTX 50-series desktop GPUs (5060 Ti in 8 GB and 16 GB)', () => {
    const slugs = getAllGpus().map((g) => g.slug);
    expect(slugs).toEqual([
      'rtx-5050',
      'rtx-5060',
      'rtx-5060-ti-8gb',
      'rtx-5060-ti',
      'rtx-5070',
      'rtx-5070-ti',
      'rtx-5080',
      'rtx-5090',
    ]);
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

  it('adjacentGpus forms a consistent chain in list order', () => {
    const gpus = getAllGpus();
    gpus.forEach((gpu, i) => {
      expect(gpu.adjacentGpus.stepDown).toBe(i > 0 ? gpus[i - 1].slug : '');
      expect(gpu.adjacentGpus.stepUp).toBe(i < gpus.length - 1 ? gpus[i + 1].slug : '');
    });
  });

  it('average FPS drops as resolution goes up', () => {
    for (const gpu of getAllGpus()) {
      expect(gpu.fps['1080p'].avg).toBeGreaterThan(gpu.fps['1440p'].avg);
      expect(gpu.fps['1440p'].avg).toBeGreaterThan(gpu.fps['4K'].avg);
    }
  });

  it('memory bandwidth matches the official bus width for each memory type', () => {
    // GDDR7 nos modelos da série 50 roda a 28-30 Gbps; GDDR6 da 5050 a 20 Gbps.
    for (const gpu of getAllGpus()) {
      const gbps = (gpu.memoryBandwidth * 8) / gpu.memoryBus;
      if (gpu.vramType === 'GDDR6') expect(gbps).toBe(20);
      else expect(gbps).toBeGreaterThanOrEqual(28);
    }
  });

  it('documents the data sources', () => {
    expect(gpuData.sources.specs.url).toMatch(/^https:\/\/www\.nvidia\.com\//);
    expect(gpuData.sources.benchmarks.url).toMatch(/^https:\/\/www\.techpowerup\.com\//);
    expect(gpuData.sources.benchmarks.testSystem).toBeTruthy();
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
    expect(links?.amazon?.url).toMatch(/^https:\/\//);
  });

  it('returns undefined for an invalid slug', () => {
    const links = getAffiliateLinks('rtx-9999');
    expect(links).toBeUndefined();
  });

  it('every GPU has an affiliate entry', () => {
    for (const gpu of getAllGpus()) {
      expect(getAffiliateLinks(gpu.slug)).toBeDefined();
    }
  });

  it('never stores prices (only guaranteed store prices may be shown)', () => {
    for (const gpu of getAllGpus()) {
      const links = getAffiliateLinks(gpu.slug) as Record<string, unknown> | undefined;
      expect(links).not.toHaveProperty('priceRange');
      for (const store of ['amazon', 'mercadoLivre']) {
        expect((links?.[store] as Record<string, unknown> | undefined) ?? {}).not.toHaveProperty('displayPrice');
      }
    }
  });

  it('never ships placeholder links', () => {
    for (const gpu of getAllGpus()) {
      const links = getAffiliateLinks(gpu.slug);
      for (const store of [links?.amazon, links?.mercadoLivre]) {
        if (store) expect(store.url).not.toMatch(/PLACEHOLDER|SEU-TAG|SEU-ID/);
      }
    }
  });
});
