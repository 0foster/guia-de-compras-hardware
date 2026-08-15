import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import * as cheerio from 'cheerio';
import SearchDropdown from './SearchDropdown.astro';

describe('SearchDropdown (Mobile & Multi-instance support)', () => {
  it('renders search input with classes instead of single IDs for multi-instance support', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SearchDropdown);
    const $ = cheerio.load(html);

    expect($('.search-wrapper').length).toBe(1);
    expect($('.search-input').length).toBe(1);
    expect($('.search-dropdown').length).toBe(1);
    expect($('.search-results').length).toBe(1);

    // Ensure we do not use static ID search-input which broke mobile search when rendered twice
    expect($('#search-input').length).toBe(0);
  });

  it('contains anti-zoom font size class (text-base) for iOS mobile browsers', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SearchDropdown);
    const $ = cheerio.load(html);

    const inputClasses = $('.search-input').attr('class') || '';
    expect(inputClasses).toContain('text-base');
    expect(inputClasses).toContain('sm:text-sm');
  });

  it('renders client-side data script for instant matching', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SearchDropdown);

    expect(html).toContain('window.__GPU_SEARCH_DATA__');
  });
});
