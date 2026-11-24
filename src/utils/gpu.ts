import gpuData from '../data/gpus.json';
import affiliateData from '../data/affiliate-links.json';

export type Gpu = (typeof gpuData.gpus)[number];

/**
 * Link de compra em uma loja.
 * Não guardamos preço: só exibimos preço quando ele vier garantido da própria loja.
 */
export interface StoreLink {
  url: string;
  /** Modelo exato do produto para onde o link leva (conferido manualmente). */
  sellerNote?: string;
  inStock: boolean;
}

export interface AffiliateLink {
  lastUpdated: string;
  amazon?: StoreLink;
  mercadoLivre?: StoreLink;
}

const links = affiliateData.links as Record<string, AffiliateLink>;

export function getAllGpus(): Gpu[] {
  return gpuData.gpus;
}

export function getGpuBySlug(slug: string): Gpu | undefined {
  return gpuData.gpus.find((gpu) => gpu.slug === slug);
}

export function getAffiliateLinks(slug: string): AffiliateLink | undefined {
  return links[slug];
}
