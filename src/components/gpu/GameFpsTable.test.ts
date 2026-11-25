import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import * as cheerio from 'cheerio';
import GameFpsTable from './GameFpsTable.astro';

async function render(props: Record<string, unknown>) {
  const container = await AstroContainer.create();
  return cheerio.load(await container.renderToString(GameFpsTable, { props }));
}

describe('GameFpsTable', () => {
  it('renders one section per category with all 24 games', async () => {
    const $ = await render({ gpuSlug: 'rtx-5070', defaultResolution: '1440p' });
    expect($('[data-category]').length).toBe(5);
    expect($('[data-game]').length).toBe(24);
    expect($('[data-category="tiro"] h3').text()).toContain('Tiro (FPS)');
  });

  it('starts on the default resolution', async () => {
    const $ = await render({ gpuSlug: 'rtx-5070', defaultResolution: '1440p' });
    expect($('.game-fps').attr('data-active-res')).toBe('1440p');
    expect($('[data-res-btn="1440p"]').attr('aria-pressed')).toBe('true');
    expect($('[data-res-btn="1080p"]').attr('aria-pressed')).toBe('false');
  });

  it('shows FPS in pt-BR format for each resolution', async () => {
    const $ = await render({ gpuSlug: 'rtx-5070', defaultResolution: '1440p' });
    const cs2 = $('[data-game="counter-strike-2"]');
    expect(cs2.find('[data-res="1080p"]').text()).toContain('428,0 FPS');
    expect(cs2.find('[data-res="1440p"]').text()).toContain('298,8 FPS');
    expect(cs2.find('[data-res="4K"]').text()).toContain('157,8 FPS');
  });

  it('cites the source', async () => {
    const $ = await render({ gpuSlug: 'rtx-5070' });
    expect($('a[href*="techpowerup.com/review/"]').length).toBe(2);
  });

  it('renders nothing for an unknown GPU', async () => {
    const $ = await render({ gpuSlug: 'rtx-9999' });
    expect($('.game-fps').length).toBe(0);
  });
});
