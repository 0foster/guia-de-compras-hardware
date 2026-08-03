import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import * as cheerio from 'cheerio';
import FilterPanel from './FilterPanel.astro';

describe('FilterPanel (Mobile ergonomics & Multi-instance support)', () => {
  it('renders controls with data-filter-role attributes instead of static IDs', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(FilterPanel);
    const $ = cheerio.load(html);

    expect($('[data-filter-role="min-handle"]').length).toBe(1);
    expect($('[data-filter-role="max-handle"]').length).toBe(1);
    expect($('[data-filter-role="min-input"]').length).toBe(1);
    expect($('[data-filter-role="max-input"]').length).toBe(1);
    expect($('[data-filter-role="clear-filters"]').length).toBe(1);
    expect($('#price-min-handle').length).toBe(0);
  });

  it('applies unique namePrefix to radio group to avoid conflict between desktop sidebar and mobile drawer', async () => {
    const container = await AstroContainer.create();
    
    const desktopHtml = await container.renderToString(FilterPanel, { props: { namePrefix: 'desktop' } });
    const $desktop = cheerio.load(desktopHtml);
    expect($desktop('input[name="vram-desktop"]').length).toBe(4);

    const mobileHtml = await container.renderToString(FilterPanel, { props: { namePrefix: 'mobile' } });
    const $mobile = cheerio.load(mobileHtml);
    expect($mobile('input[name="vram-mobile"]').length).toBe(4);
  });

  it('contains anti-zoom font size (text-base sm:text-sm) on number inputs for iOS', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(FilterPanel);
    const $ = cheerio.load(html);

    const minInputClasses = $('[data-filter-role="min-input"]').attr('class') || '';
    expect(minInputClasses).toContain('text-base');
    expect(minInputClasses).toContain('sm:text-sm');
  });
});
