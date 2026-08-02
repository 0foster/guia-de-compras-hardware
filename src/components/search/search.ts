/**
 * Client-side fuzzy search engine for GPUs.
 *
 * Features:
 * - Partial word matching ("507" finds "RTX 5070")
 * - Accent-insensitive ("video" matches "vídeo")
 * - Case-insensitive
 * - Multi-field search (name, shortName, aiSummary, targetResolution)
 * - Relevance scoring
 */

export interface GpuSearchEntry {
  slug: string;
  name: string;
  shortName: string;
  vram: number;
  targetResolution: string[];
  aiSummary: string;
  priceMin?: number;
}

export interface SearchResult {
  gpu: GpuSearchEntry;
  score: number;
}

/**
 * Normalize a string for search comparison:
 * - Lowercase
 * - Remove accents/diacritics
 * - Collapse whitespace
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize a query string into individual search terms.
 * Filters out empty tokens.
 */
export function tokenize(query: string): string[] {
  return normalize(query).split(' ').filter(Boolean);
}

/**
 * Calculate how well a GPU matches the search query.
 * Returns 0 for no match, higher numbers = better match.
 *
 * Scoring:
 * - shortName match: 10 points per token
 * - name match: 8 points per token
 * - targetResolution match: 6 points per token
 * - vram match (e.g. "16gb"): 5 points
 * - aiSummary match: 2 points per token
 * - Exact word boundary match: +3 bonus
 */
export function matchScore(tokens: string[], gpu: GpuSearchEntry): number {
  if (tokens.length === 0) return 0;

  let score = 0;
  const shortNameNorm = normalize(gpu.shortName);
  const nameNorm = normalize(gpu.name);
  const resolutionNorm = gpu.targetResolution.map(normalize).join(' ');
  const summaryNorm = normalize(gpu.aiSummary);
  const vramStr = `${gpu.vram}gb`;

  for (const token of tokens) {
    let tokenMatched = false;

    // shortName (highest priority)
    if (shortNameNorm.includes(token)) {
      score += 10;
      tokenMatched = true;
      // Bonus for exact word boundary
      if (shortNameNorm.split(' ').some((w) => w === token)) {
        score += 3;
      }
    }

    // Full name
    if (nameNorm.includes(token)) {
      score += 8;
      tokenMatched = true;
    }

    // Resolution (e.g. "4k", "1440p")
    if (resolutionNorm.includes(token)) {
      score += 6;
      tokenMatched = true;
    }

    // VRAM (e.g. "16gb", "16")
    if (vramStr.includes(token) || `${gpu.vram}` === token) {
      score += 5;
      tokenMatched = true;
    }

    // AI summary (lowest priority, but catches descriptive queries)
    if (summaryNorm.includes(token)) {
      score += 2;
      tokenMatched = true;
    }

    // If any token has zero matches, reduce relevance significantly
    if (!tokenMatched) {
      return 0;
    }
  }

  return score;
}

/**
 * Search GPUs by query string.
 * Returns matched GPUs sorted by relevance (highest first).
 */
export function searchGpus(
  query: string,
  gpus: GpuSearchEntry[],
): SearchResult[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const results: SearchResult[] = [];

  for (const gpu of gpus) {
    const score = matchScore(tokens, gpu);
    if (score > 0) {
      results.push({ gpu, score });
    }
  }

  // Sort by score descending, then by name ascending for ties
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.gpu.name.localeCompare(b.gpu.name);
  });

  return results;
}
