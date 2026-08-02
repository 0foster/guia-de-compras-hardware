import gpuData from '../data/gpus.json';
import affiliateData from '../data/affiliate-links.json';

export type Gpu = (typeof gpuData.gpus)[number];
export type AffiliateLink = (typeof affiliateData.links)[keyof typeof affiliateData.links];

export function getAllGpus(): Gpu[] {
  return gpuData.gpus;
}

export function getGpuBySlug(slug: string): Gpu | undefined {
  return gpuData.gpus.find((gpu) => gpu.slug === slug);
}

export function getAffiliateLinks(slug: string): AffiliateLink | undefined {
  return (affiliateData.links as Record<string, AffiliateLink>)[slug];
}
