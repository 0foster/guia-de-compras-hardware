import gamesData from '../data/games.json';

export const RESOLUTIONS = ['1080p', '1440p', '4K'] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export type FpsByResolution = Record<Resolution, number>;

export interface GameCategory {
  slug: string;
  name: string;
}

export interface Game {
  slug: string;
  name: string;
  category: string;
  /** FPS por GPU (slug da GPU → FPS por resolução). */
  fps: Record<string, FpsByResolution>;
}

export interface GameFps {
  slug: string;
  name: string;
  fps: FpsByResolution;
}

export interface CategoryWithGames {
  category: GameCategory;
  games: GameFps[];
}

const categories = gamesData.categories as GameCategory[];
const games = gamesData.games as Game[];

export const gameSource = gamesData.source;

export function getCategories(): GameCategory[] {
  return categories;
}

export function getGames(): Game[] {
  return games;
}

/**
 * FPS de uma GPU em cada jogo, agrupado por categoria (na ordem de `categories`).
 * Categorias sem jogos com dados para essa GPU ficam de fora.
 */
export function getGameFpsByCategory(gpuSlug: string): CategoryWithGames[] {
  return categories
    .map((category) => ({
      category,
      games: games
        .filter((g) => g.category === category.slug && g.fps[gpuSlug])
        .map((g) => ({ slug: g.slug, name: g.name, fps: g.fps[gpuSlug] })),
    }))
    .filter((group) => group.games.length > 0);
}
