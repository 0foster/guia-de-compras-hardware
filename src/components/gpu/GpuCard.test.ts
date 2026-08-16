import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import * as cheerio from 'cheerio';
import GpuCard from './GpuCard.astro';

describe('GpuCard', () => {
  it('renders the GPU short name', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuCard, {
      props: {
        slug: 'rtx-5070',
        shortName: 'RTX 5070',
        vram: 12,
        targetResolution: ['1440p'],
        aiSummary: 'GPU excelente para 1440p.',
        fpsAvg1440p: 169,
        priceMin: 4299,
        priceMax: 4999,
        inStock: true,
      },
    });

    const $ = cheerio.load(html);
    expect($('h3').text()).toContain('RTX 5070');
  });

  it('renders VRAM badge', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuCard, {
      props: {
        slug: 'rtx-5070-ti',
        shortName: 'RTX 5070 Ti',
        vram: 16,
        targetResolution: ['1440p', '4K'],
        aiSummary: 'Sweet spot para gamers.',
        fpsAvg1440p: 201,
        priceMin: 7490,
        priceMax: 8900,
        inStock: true,
      },
    });

    expect(html).toContain('16 GB');
  });

  it('renders resolution tags', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuCard, {
      props: {
        slug: 'rtx-5070-ti',
        shortName: 'RTX 5070 Ti',
        vram: 16,
        targetResolution: ['1440p', '4K'],
        aiSummary: 'Sweet spot para gamers.',
        fpsAvg1440p: 201,
        priceMin: 7490,
        priceMax: 8900,
        inStock: true,
      },
    });

    expect(html).toContain('1440p');
    expect(html).toContain('4K');
  });

  it('shows "Consultar preço" when in stock', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuCard, {
      props: {
        slug: 'rtx-5070',
        shortName: 'RTX 5070',
        vram: 12,
        targetResolution: ['1440p'],
        aiSummary: 'GPU excelente.',
        fpsAvg1440p: 169,
        priceMin: 4299,
        priceMax: 4999,
        inStock: true,
      },
    });

    expect(html).toContain('Consultar preço');
  });

  it('shows "Indisponível" when out of stock', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuCard, {
      props: {
        slug: 'rtx-5070',
        shortName: 'RTX 5070',
        vram: 12,
        targetResolution: ['1440p'],
        aiSummary: 'GPU excelente.',
        fpsAvg1440p: 169,
        inStock: false,
      },
    });

    expect(html).toContain('Indisponível');
  });

  it('renders FPS average', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuCard, {
      props: {
        slug: 'rtx-5070',
        shortName: 'RTX 5070',
        vram: 12,
        targetResolution: ['1440p'],
        aiSummary: 'GPU excelente.',
        fpsAvg1440p: 169,
        priceMin: 4299,
        priceMax: 4999,
        inStock: true,
      },
    });

    expect(html).toContain('169');
    expect(html).toContain('FPS médio 1440p');
  });

  it('shows "Indisponível" when out of stock', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuCard, {
      props: {
        slug: 'rtx-5070',
        shortName: 'RTX 5070',
        vram: 12,
        targetResolution: ['1440p'],
        aiSummary: 'GPU excelente.',
        fpsAvg1440p: 169,
        priceMin: 4299,
        priceMax: 4999,
        inStock: false,
      },
    });

    expect(html).toContain('Indisponível');
  });

  it('links to the correct detail page', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuCard, {
      props: {
        slug: 'rtx-5090',
        shortName: 'RTX 5090',
        vram: 32,
        targetResolution: ['4K'],
        aiSummary: 'O topo absoluto.',
        fpsAvg1440p: 265,
        priceMin: 17999,
        priceMax: 22999,
        inStock: true,
      },
    });

    const $ = cheerio.load(html);
    const link = $('a[href="/gpus/rtx-5090"]');
    expect(link.length).toBe(1);
  });

  it('sets correct data attributes for filtering', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GpuCard, {
      props: {
        slug: 'rtx-5070-ti',
        shortName: 'RTX 5070 Ti',
        vram: 16,
        targetResolution: ['1440p', '4K'],
        aiSummary: 'Sweet spot.',
        fpsAvg1440p: 201,
        priceMin: 7490,
        priceMax: 8900,
        inStock: true,
      },
    });

    const $ = cheerio.load(html);
    const card = $('[data-slug="rtx-5070-ti"]');
    expect(card.length).toBe(1);
    expect(card.attr('data-vram')).toBe('16');
    expect(card.attr('data-price-min')).toBe('7490');
    expect(card.attr('data-resolution')).toBe('1440p,4K');
  });
});
