import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { buildCatalog } from './catalog';
import { renderCompare } from './compare-render';

const catalog = buildCatalog();
const render = (slugs: string[], opts: { res?: '1080p' | '1440p' | '4K'; onlyDiff?: boolean } = {}) =>
  cheerio.load(renderCompare({ slugs, res: opts.res ?? '1440p', onlyDiff: opts.onlyDiff ?? false }, catalog));

describe('renderCompare', () => {
  it('mostra uma coluna por placa, com a 1ª marcada como referência', () => {
    const $ = render(['rtx-5070', 'rtx-5070-ti', 'rtx-5080']);
    expect($('.compare-head [data-gpu]').map((_, el) => $(el).attr('data-gpu')).get()).toEqual(['rtx-5070', 'rtx-5070-ti', 'rtx-5080']);
    expect($('.compare-head').text()).toContain('Referência');
    expect($('button[data-action="ref"]').length).toBe(2);
  });

  it('com 3 placas não oferece "adicionar"; com 2 oferece e não deixa remover', () => {
    const three = render(['rtx-5070', 'rtx-5070-ti', 'rtx-5080']);
    expect(three('select[data-action="add"]').length).toBe(0);
    expect(three('button[data-action="remove"]').length).toBe(3);

    const two = render(['rtx-5070', 'rtx-5080']);
    expect(two('select[data-action="add"]').length).toBe(1);
    expect(two('button[data-action="remove"]').length).toBe(0);
  });

  it('não deixa escolher a mesma placa duas vezes', () => {
    const $ = render(['rtx-5070', 'rtx-5080']);
    expect($('#compare-swap-0 option[value="rtx-5080"]').attr('disabled')).toBeDefined();
    expect($('#compare-swap-0 option[value="rtx-5090"]').attr('disabled')).toBeUndefined();
  });

  it('destaca o melhor valor e mostra a diferença sobre a referência', () => {
    const $ = render(['rtx-5070', 'rtx-5080']);
    const cells = $('[data-row="fps-1440p"] [data-gpu]');
    expect(cells.eq(0).text().trim()).toBe('108,4');
    expect(cells.eq(1).text()).toContain('149,1');
    expect(cells.eq(1).text()).toContain('+38%');
    expect(cells.eq(1).attr('class')).toContain('text-green-600');
  });

  it('mostra o veredito', () => {
    const $ = render(['rtx-5070', 'rtx-5070-ti', 'rtx-5080']);
    expect($('li').first().text()).toBe('Mais rápida em 1440p: RTX 5080, 38% acima da RTX 5070.');
  });

  it('"só diferenças" esconde as linhas iguais e avisa quantas', () => {
    const all = render(['rtx-5070', 'rtx-5080']);
    const diff = render(['rtx-5070', 'rtx-5080'], { onlyDiff: true });
    expect(all('[data-row="hdmi"]').length).toBe(1);
    expect(diff('[data-row="hdmi"]').length).toBe(0);
    expect(diff.text()).toContain('Conectividade: tudo igual (4 itens)');
  });

  it('os jogos seguem a resolução escolhida', () => {
    const $ = render(['rtx-5070', 'rtx-5080'], { res: '4K' });
    expect($('[data-row="counter-strike-2"] [data-gpu]').first().text().trim()).toBe('157,8');
    expect($('h2').last().text()).toBe('FPS por jogo · 4K');
  });

  it('botão de compra só para quem tem link', () => {
    const $ = render(['rtx-5070', 'rtx-5090']);
    expect($('[data-gpu="rtx-5070"] a[rel*="sponsored"]').length).toBe(1);
    expect($('[data-gpu="rtx-5090"]').text()).toContain('Links em breve');
  });
});
