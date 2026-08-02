import { describe, it, expect } from 'vitest';
import {
  normalize,
  tokenize,
  matchScore,
  searchGpus,
  type GpuSearchEntry,
} from './search';

// --- Test data ---
const mockGpus: GpuSearchEntry[] = [
  {
    slug: 'rtx-5050',
    name: 'NVIDIA GeForce RTX 5050',
    shortName: 'RTX 5050',
    vram: 8,
    targetResolution: ['1080p'],
    aiSummary:
      'A RTX 5050 é a porta de entrada da geração Blackwell, ideal para 1080p competitivo.',
    priceMin: 1799,
  },
  {
    slug: 'rtx-5070',
    name: 'NVIDIA GeForce RTX 5070',
    shortName: 'RTX 5070',
    vram: 12,
    targetResolution: ['1440p'],
    aiSummary:
      'Posicionada para dominar o 1440p com folga, excelente para high refresh rate.',
    priceMin: 4299,
  },
  {
    slug: 'rtx-5070-ti',
    name: 'NVIDIA GeForce RTX 5070 Ti',
    shortName: 'RTX 5070 Ti',
    vram: 16,
    targetResolution: ['1440p', '4K'],
    aiSummary:
      'Excelente para quem joga em 1440p e quer margem para 4K no futuro. O sweet spot.',
    priceMin: 7490,
  },
  {
    slug: 'rtx-5090',
    name: 'NVIDIA GeForce RTX 5090',
    shortName: 'RTX 5090',
    vram: 32,
    targetResolution: ['4K'],
    aiSummary:
      'O topo absoluto da linha Blackwell — 32GB de GDDR7 e 21.760 CUDA cores.',
    priceMin: 17999,
  },
];

// === normalize() ===

describe('normalize', () => {
  it('lowercases text', () => {
    expect(normalize('RTX 5070')).toBe('rtx 5070');
  });

  it('removes accents/diacritics', () => {
    expect(normalize('vídeo')).toBe('video');
    expect(normalize('geração')).toBe('geracao');
    expect(normalize('é')).toBe('e');
  });

  it('collapses whitespace', () => {
    expect(normalize('  RTX   5070  ')).toBe('rtx 5070');
  });

  it('handles empty string', () => {
    expect(normalize('')).toBe('');
  });

  it('handles mixed accents and case', () => {
    expect(normalize('Placa de Vídeo RTX')).toBe('placa de video rtx');
  });
});

// === tokenize() ===

describe('tokenize', () => {
  it('splits into lowercase accent-free tokens', () => {
    expect(tokenize('RTX 5070')).toEqual(['rtx', '5070']);
  });

  it('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('returns empty array for whitespace-only', () => {
    expect(tokenize('   ')).toEqual([]);
  });

  it('handles accented input', () => {
    expect(tokenize('Vídeo Gráfica')).toEqual(['video', 'grafica']);
  });
});

// === matchScore() ===

describe('matchScore', () => {
  it('returns 0 for empty tokens', () => {
    expect(matchScore([], mockGpus[0])).toBe(0);
  });

  it('scores higher for shortName matches', () => {
    const tokens = tokenize('5070');
    const score5070 = matchScore(tokens, mockGpus[1]); // RTX 5070
    expect(score5070).toBeGreaterThan(0);
  });

  it('returns 0 when any token has no match', () => {
    const tokens = tokenize('rtx xyz');
    const score = matchScore(tokens, mockGpus[0]);
    expect(score).toBe(0);
  });

  it('matches partial words (507 matches 5070)', () => {
    const tokens = tokenize('507');
    const score = matchScore(tokens, mockGpus[1]); // RTX 5070
    expect(score).toBeGreaterThan(0);
  });

  it('matches resolution targets', () => {
    const tokens = tokenize('4k');
    const score5070ti = matchScore(tokens, mockGpus[2]); // 1440p + 4K
    const score5050 = matchScore(tokens, mockGpus[0]); // 1080p only
    expect(score5070ti).toBeGreaterThan(0);
    expect(score5050).toBe(0); // no 4K in resolution, no "4k" in summary for 5050
  });

  it('matches VRAM searches', () => {
    const tokens = tokenize('16gb');
    const score = matchScore(tokens, mockGpus[2]); // 16 GB VRAM
    expect(score).toBeGreaterThan(0);
  });

  it('matches content in aiSummary', () => {
    const tokens = tokenize('blackwell');
    const score5050 = matchScore(tokens, mockGpus[0]); // mentions Blackwell
    expect(score5050).toBeGreaterThan(0);
  });

  it('is accent-insensitive', () => {
    const tokens = tokenize('geracao');
    const score5050 = matchScore(tokens, mockGpus[0]); // "geração" in summary
    expect(score5050).toBeGreaterThan(0);
  });
});

// === searchGpus() ===

describe('searchGpus', () => {
  it('returns empty array for empty query', () => {
    expect(searchGpus('', mockGpus)).toEqual([]);
  });

  it('returns empty array for whitespace query', () => {
    expect(searchGpus('   ', mockGpus)).toEqual([]);
  });

  it('finds GPU by partial name', () => {
    const results = searchGpus('507', mockGpus);
    expect(results.length).toBeGreaterThanOrEqual(2); // 5070 and 5070 Ti
    expect(results.map((r) => r.gpu.slug)).toContain('rtx-5070');
    expect(results.map((r) => r.gpu.slug)).toContain('rtx-5070-ti');
  });

  it('ranks exact shortName match higher', () => {
    const results = searchGpus('rtx 5070', mockGpus);
    // RTX 5070 (exact short name match) should be first
    // RTX 5070 Ti also matches but with lower bonus
    expect(results.length).toBeGreaterThanOrEqual(2);
    // Both match "rtx" and "5070" but RTX 5070 gets exact word boundary bonus
    expect(results[0].gpu.slug).toBe('rtx-5070');
  });

  it('finds GPUs by resolution', () => {
    const results = searchGpus('4k', mockGpus);
    const slugs = results.map((r) => r.gpu.slug);
    expect(slugs).toContain('rtx-5090');
    expect(slugs).toContain('rtx-5070-ti');
  });

  it('finds nothing for unrelated query', () => {
    const results = searchGpus('processador ryzen', mockGpus);
    expect(results).toHaveLength(0);
  });

  it('handles accent-insensitive multi-word query', () => {
    const results = searchGpus('placa video', mockGpus);
    // "placa" doesn't appear but "video" doesn't appear in data either
    // This should return 0 results since all tokens must match
    expect(results).toHaveLength(0);
  });

  it('results are sorted by score descending', () => {
    const results = searchGpus('rtx', mockGpus);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  });

  it('every result has a positive score', () => {
    const results = searchGpus('5070', mockGpus);
    for (const result of results) {
      expect(result.score).toBeGreaterThan(0);
    }
  });

  it('single character partial match works', () => {
    // "5" should match all GPUs (all have "5" in their name)
    const results = searchGpus('5', mockGpus);
    expect(results.length).toBe(mockGpus.length);
  });
});
