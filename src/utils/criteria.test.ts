import { describe, it, expect } from 'vitest';
import { buildCatalog } from './catalog';
import { applyCriteria, evaluate, evaluateAll, fpsMetric, metricResolution, efficiency } from './criteria';

const catalog = buildCatalog();
const gpu = (slug: string) => catalog.gpus.find((g) => g.slug === slug)!;
const slugs = (list: { gpu: { slug: string } }[]) => list.map((e) => e.gpu.slug);
const ALL = catalog.gpus.map((g) => g.slug);

describe('applyCriteria — filtros que já existiam (mesmo comportamento de antes)', () => {
  it('sem critérios, todas as placas passam na ordem do catálogo', () => {
    expect(slugs(applyCriteria(catalog, {}))).toEqual(ALL);
  });

  it('resolução 4K mostra as placas indicadas para 4K', () => {
    expect(slugs(applyCriteria(catalog, { resolutions: ['4K'] }))).toEqual(['rtx-5070-ti', 'rtx-5080', 'rtx-5090']);
  });

  it('várias resoluções funcionam como "ou"', () => {
    expect(slugs(applyCriteria(catalog, { resolutions: ['1080p', '4K'] }))).toEqual(
      ALL.filter((s) => s !== 'rtx-5070'),
    );
  });

  it('VRAM mínima de 16 GB', () => {
    expect(slugs(applyCriteria(catalog, { minVram: 16 }))).toEqual(['rtx-5060-ti', 'rtx-5070-ti', 'rtx-5080', 'rtx-5090']);
  });

  it('VRAM 0 equivale a "sem preferência"', () => {
    expect(slugs(applyCriteria(catalog, { minVram: 0 }))).toEqual(ALL);
  });
});

describe('fpsMetric — qual FPS mostrar', () => {
  it('sem resolução escolhida, usa a resolução ideal da placa e a média geral', () => {
    const m = fpsMetric(gpu('rtx-5070-ti'), {}, catalog);
    expect(m).toEqual({ value: 133.1, resolution: '1440p', scope: 'average', label: 'média de 24 jogos' });
  });

  it('com uma resolução escolhida, mede nela', () => {
    expect(metricResolution(gpu('rtx-5090'), { resolutions: ['1080p'] })).toBe('1080p');
    expect(fpsMetric(gpu('rtx-5090'), { resolutions: ['1080p'] }, catalog).value).toBe(240.0);
  });

  it('com várias resoluções escolhidas, volta para a ideal da placa', () => {
    expect(metricResolution(gpu('rtx-5090'), { resolutions: ['1080p', '1440p'] })).toBe('4K');
  });

  it('com jogo escolhido, mede no jogo', () => {
    const m = fpsMetric(gpu('rtx-5070'), { game: 'cyberpunk-2077', resolutions: ['1440p'] }, catalog);
    expect(m).toEqual({ value: 104.2, resolution: '1440p', scope: 'game', label: 'Cyberpunk 2077' });
  });

  it('com tipo de jogo escolhido, usa a média dos jogos daquele tipo', () => {
    // Tiro em 1440p na RTX 5070: CS2 298,8 · DOOM 188,8 · Stalker 2 66,6 → média 184,7
    const m = fpsMetric(gpu('rtx-5070'), { category: 'tiro', resolutions: ['1440p'] }, catalog);
    expect(m).toEqual({ value: 184.7, resolution: '1440p', scope: 'category', label: 'média de Tiro (FPS)' });
  });

  it('jogo tem prioridade sobre tipo de jogo', () => {
    const m = fpsMetric(gpu('rtx-5070'), { game: 'f1-24', category: 'tiro', resolutions: ['4K'] }, catalog);
    expect(m.scope).toBe('game');
    expect(m.value).toBe(119.5);
  });

  it('jogo ou tipo desconhecido cai na média geral', () => {
    expect(fpsMetric(gpu('rtx-5070'), { game: 'nao-existe' }, catalog).scope).toBe('average');
    expect(fpsMetric(gpu('rtx-5070'), { category: 'mmo' }, catalog).scope).toBe('average');
  });
});

describe('applyCriteria — critérios novos', () => {
  it('meta de FPS num jogo (o exemplo do desenho)', () => {
    // Cyberpunk 1440p, 60+ FPS, 12 GB+, fonte 750 W
    const result = applyCriteria(catalog, {
      resolutions: ['1440p'],
      game: 'cyberpunk-2077',
      minFps: 60,
      minVram: 12,
      psuWatts: 750,
    });
    expect(slugs(result)).toEqual(['rtx-5060-ti', 'rtx-5070', 'rtx-5070-ti']);
  });

  it('meta de 144 FPS em Cyberpunk 1440p com fonte de 750 W não deixa nenhuma placa passar', () => {
    expect(applyCriteria(catalog, { resolutions: ['1440p'], game: 'cyberpunk-2077', minFps: 144, psuWatts: 750 })).toEqual([]);
  });

  it('fonte do visitante', () => {
    expect(slugs(applyCriteria(catalog, { psuWatts: 650 }))).toEqual([
      'rtx-5050',
      'rtx-5060',
      'rtx-5060-ti-8gb',
      'rtx-5060-ti',
      'rtx-5070',
    ]);
  });

  it('meta pela média do tipo de jogo', () => {
    // Média de Tiro em 4K ≥ 144: só a 5090 (CS2 348,7 · DOOM 240 · Stalker 78,7 → 222,5) e a 5080 (149,4)
    expect(slugs(applyCriteria(catalog, { category: 'tiro', minFps: 144, resolutions: ['4K'] }))).toEqual(['rtx-5080', 'rtx-5090']);
  });
});

describe('ordenação', () => {
  it('por desempenho, da mais rápida para a mais lenta', () => {
    expect(slugs(applyCriteria(catalog, { sort: 'performance', resolutions: ['4K'] }))).toEqual(['rtx-5090', 'rtx-5080', 'rtx-5070-ti']);
  });

  it('marcar uma resolução também filtra pelas placas indicadas para ela (comportamento atual)', () => {
    // A 5090 é indicada só para 4K, então some ao marcar 1080p.
    expect(slugs(applyCriteria(catalog, { sort: 'performance', resolutions: ['1080p'] }))[0]).toBe('rtx-5060-ti-8gb');
  });

  it('por eficiência (FPS por watt)', () => {
    const list = applyCriteria(catalog, { sort: 'efficiency', resolutions: ['1440p'] });
    for (let i = 1; i < list.length; i++) {
      expect(efficiency(list[i - 1])).toBeGreaterThanOrEqual(efficiency(list[i]));
    }
  });

  it('por VRAM e, no empate, desempenho', () => {
    // 1440p: 5080, 5070 Ti e 5060 Ti têm 16 GB → desempate por FPS; a 5070 (12 GB) vem por último
    expect(slugs(applyCriteria(catalog, { sort: 'vram', resolutions: ['1440p'] }))).toEqual([
      'rtx-5080',
      'rtx-5070-ti',
      'rtx-5060-ti',
      'rtx-5070',
      'rtx-5060-ti-8gb',
      'rtx-5060',
    ]);
  });

  it('por consumo, do menor para o maior', () => {
    expect(slugs(applyCriteria(catalog, { sort: 'power' }))[0]).toBe('rtx-5050');
    expect(slugs(applyCriteria(catalog, { sort: 'power' })).at(-1)).toBe('rtx-5090');
  });
});

describe('evaluate — explica por que a placa passou ou não', () => {
  it('lista os motivos em linguagem simples', () => {
    const e = evaluate(gpu('rtx-5080'), { resolutions: ['1440p'], game: 'cyberpunk-2077', minFps: 144, minVram: 12, psuWatts: 750 }, catalog);
    expect(e.passes).toBe(false);
    expect(e.reasons).toEqual([
      { key: 'resolution', ok: true, text: 'Indicada para 1440p e 4K' },
      { key: 'vram', ok: true, text: '16 GB de VRAM (mínimo 12 GB)' },
      { key: 'fps', ok: false, text: 'Cyberpunk 2077 em 1440p: 137,6 FPS (meta 144)' },
      { key: 'psu', ok: false, text: 'Pede fonte de 850 W (a sua: 750 W)' },
    ]);
  });

  it('evaluateAll devolve também as que não passam (útil para "quase lá" no assistente)', () => {
    const all = evaluateAll(catalog, { psuWatts: 650 });
    expect(all).toHaveLength(8);
    expect(all.filter((e) => !e.passes).map((e) => e.gpu.slug)).toEqual(['rtx-5070-ti', 'rtx-5080', 'rtx-5090']);
  });
});
