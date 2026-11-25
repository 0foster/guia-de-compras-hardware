import { describe, it, expect } from 'vitest';
import { buildCatalog } from './catalog';
import {
  applyCriteria,
  classify,
  evaluate,
  evaluateAll,
  efficiency,
  fpsMetric,
  metricResolution,
  recommend,
  effectiveSort,
  type Criteria,
} from './criteria';

const catalog = buildCatalog();
const gpu = (slug: string) => catalog.gpus.find((g) => g.slug === slug)!;
const slugs = (list: { gpu: { slug: string } }[]) => list.map((e) => e.gpu.slug);
const fits = (c: Criteria) => Object.fromEntries(evaluateAll(catalog, c).map((e) => [e.gpu.slug, e.fit]));
const recommended = (c: Criteria) => recommend(applyCriteria(catalog, c));
const ALL = catalog.gpus.map((g) => g.slug);

describe('classify — situação da placa no monitor', () => {
  it('usa os limites decididos (50 FPS, taxa do monitor, 1,5× a taxa)', () => {
    expect(classify(49.9, 144)).toBe('insufficient');
    expect(classify(50, 144)).toBe('playable');
    expect(classify(143.9, 144)).toBe('playable');
    expect(classify(144, 144)).toBe('ideal');
    expect(classify(215.9, 144)).toBe('ideal');
    expect(classify(216, 144)).toBe('surplus');
  });

  it('em 60 Hz, de 50 a 59 é jogável e a partir de 90 sobra', () => {
    expect(classify(55, 60)).toBe('playable');
    expect(classify(60, 60)).toBe('ideal');
    expect(classify(90, 60)).toBe('surplus');
  });
});

describe('sem monitor escolhido', () => {
  it('todas as placas passam, na ordem do catálogo, sem situação', () => {
    const result = applyCriteria(catalog, {});
    expect(slugs(result)).toEqual(ALL);
    expect(result.every((e) => e.fit === undefined)).toBe(true);
    expect(recommend(result)).toBeNull();
  });

  it('o FPS é medido na resolução ideal de cada placa', () => {
    expect(fpsMetric(gpu('rtx-5070-ti'), {}, catalog)).toEqual({
      value: 133.1,
      resolution: '1440p',
      scope: 'average',
      label: 'média de 24 jogos',
    });
  });
});

describe('monitor 1440p 144 Hz — o contexto muda com o que a pessoa joga', () => {
  const monitor: Criteria = { resolution: '1440p', refreshRate: 144 };

  it('média dos 24 jogos: só 5080 e 5090 aproveitam; recomendada 5080', () => {
    expect(fits(monitor)).toEqual({
      'rtx-5050': 'playable',
      'rtx-5060': 'playable',
      'rtx-5060-ti-8gb': 'playable',
      'rtx-5060-ti': 'playable',
      'rtx-5070': 'playable',
      'rtx-5070-ti': 'playable',
      'rtx-5080': 'ideal',
      'rtx-5090': 'ideal',
    });
    expect(recommended(monitor)?.evaluation.gpu.slug).toBe('rtx-5080');
  });

  it('Counter-Strike 2: a 5060 já aproveita; da 5070 para cima sobra', () => {
    const c = { ...monitor, games: ['counter-strike-2'] };
    expect(fits(c)).toMatchObject({
      'rtx-5050': 'playable',
      'rtx-5060': 'ideal',
      'rtx-5070': 'surplus',
      'rtx-5090': 'surplus',
    });
    expect(recommended(c)).toMatchObject({ kind: 'recommended', evaluation: { gpu: { slug: 'rtx-5060' } } });
  });

  it('Corrida (F1 24): recomendada 5070', () => {
    const c = { ...monitor, category: 'corrida' };
    expect(fits(c)).toMatchObject({ 'rtx-5060-ti': 'playable', 'rtx-5070': 'ideal', 'rtx-5070-ti': 'ideal', 'rtx-5080': 'surplus' });
    expect(recommended(c)?.evaluation.gpu.slug).toBe('rtx-5070');
  });

  it('Tiro (média): 5070 aproveita, mas o card avisa o jogo mais pesado', () => {
    const m = fpsMetric(gpu('rtx-5070'), { ...monitor, category: 'tiro' }, catalog);
    expect(m).toEqual({
      value: 184.7,
      resolution: '1440p',
      scope: 'category',
      label: 'média de Tiro (FPS)',
      worst: { name: 'S.T.A.L.K.E.R. 2', value: 66.6 },
    });
    expect(recommended({ ...monitor, category: 'tiro' })?.evaluation.gpu.slug).toBe('rtx-5070');
  });

  it('a ordem padrão é "mais adequada": aproveitam (da mais simples), sobram, jogáveis (mais perto primeiro)', () => {
    const c = { ...monitor, games: ['counter-strike-2'] };
    expect(effectiveSort(c)).toBe('fit');
    expect(slugs(applyCriteria(catalog, c))).toEqual([
      'rtx-5060',
      'rtx-5060-ti',
      'rtx-5060-ti-8gb',
      'rtx-5070',
      'rtx-5070-ti',
      'rtx-5080',
      'rtx-5090',
      'rtx-5050',
    ]);
  });
});

describe('vários jogos escolhidos', () => {
  it('usa a média dos jogos e informa o mais pesado', () => {
    const m = fpsMetric(gpu('rtx-5070'), { resolution: '1440p', games: ['counter-strike-2', 'cyberpunk-2077'] }, catalog);
    expect(m).toEqual({
      value: 201.5,
      resolution: '1440p',
      scope: 'games',
      label: 'média de 2 jogos escolhidos',
      worst: { name: 'Cyberpunk 2077', value: 104.2 },
    });
  });

  it('um jogo só usa o nome do jogo e não tem "mais pesado"', () => {
    const m = fpsMetric(gpu('rtx-5070'), { resolution: '1440p', games: ['cyberpunk-2077'] }, catalog);
    expect(m.label).toBe('Cyberpunk 2077');
    expect(m.worst).toBeUndefined();
  });

  it('jogos escolhidos têm prioridade sobre o tipo de jogo; jogos inválidos são ignorados', () => {
    expect(fpsMetric(gpu('rtx-5070'), { games: ['f1-24'], category: 'tiro', resolution: '4K' }, catalog).value).toBe(119.5);
    expect(fpsMetric(gpu('rtx-5070'), { games: ['nao-existe'] }, catalog).scope).toBe('average');
  });
});

describe('outros monitores', () => {
  it('4K 60 Hz: as placas abaixo de 50 FPS somem; 5070 e 5070 Ti aproveitam', () => {
    const c: Criteria = { resolution: '4K', refreshRate: 60 };
    expect(slugs(applyCriteria(catalog, c))).toEqual(['rtx-5070', 'rtx-5070-ti', 'rtx-5080', 'rtx-5090']);
    expect(fits(c)['rtx-5050']).toBe('insufficient');
    expect(recommended(c)?.evaluation.gpu.slug).toBe('rtx-5070');
  });

  it('1080p 60 Hz: a 5050 já aproveita e as outras sobram', () => {
    const c: Criteria = { resolution: '1080p', refreshRate: 60 };
    expect(fits(c)).toMatchObject({ 'rtx-5050': 'ideal', 'rtx-5060': 'surplus', 'rtx-5090': 'surplus' });
    expect(recommended(c)?.evaluation.gpu.slug).toBe('rtx-5050');
  });

  it('resolução sem Hz considera 60 Hz', () => {
    expect(fits({ resolution: '1080p' })['rtx-5050']).toBe('ideal');
  });

  it('Hz sem resolução usa a resolução ideal de cada placa', () => {
    expect(metricResolution(gpu('rtx-5090'), { refreshRate: 144 })).toBe('4K');
    expect(fits({ refreshRate: 144 })['rtx-5090']).toBe('playable'); // 139,3 FPS em 4K
  });

  it('quando nenhuma placa aproveita o monitor, indica a mais próxima', () => {
    expect(recommended({ resolution: '4K', refreshRate: 240 })).toMatchObject({ kind: 'closest', evaluation: { gpu: { slug: 'rtx-5090' } } });
  });
});

describe('VRAM e fonte', () => {
  it('VRAM mínima de 16 GB', () => {
    expect(slugs(applyCriteria(catalog, { minVram: 16 }))).toEqual(['rtx-5060-ti', 'rtx-5070-ti', 'rtx-5080', 'rtx-5090']);
  });

  it('fonte de 650 W', () => {
    expect(slugs(applyCriteria(catalog, { psuWatts: 650 }))).toEqual(['rtx-5050', 'rtx-5060', 'rtx-5060-ti-8gb', 'rtx-5060-ti', 'rtx-5070']);
  });

  it('fonte limita a recomendação: CS2 em 1440p 144 Hz com fonte de 550 W → 5060', () => {
    const c: Criteria = { resolution: '1440p', refreshRate: 144, games: ['counter-strike-2'], psuWatts: 550 };
    expect(slugs(applyCriteria(catalog, c))).toEqual(['rtx-5060', 'rtx-5050']);
    expect(recommended(c)?.evaluation.gpu.slug).toBe('rtx-5060');
  });
});

describe('ordenações escolhidas', () => {
  it('desempenho, da mais rápida para a mais lenta', () => {
    expect(slugs(applyCriteria(catalog, { resolution: '4K', refreshRate: 60, sort: 'performance' }))).toEqual([
      'rtx-5090',
      'rtx-5080',
      'rtx-5070-ti',
      'rtx-5070',
    ]);
  });

  it('eficiência (FPS por watt)', () => {
    const list = applyCriteria(catalog, { resolution: '1440p', sort: 'efficiency' });
    for (let i = 1; i < list.length; i++) expect(efficiency(list[i - 1])).toBeGreaterThanOrEqual(efficiency(list[i]));
  });

  it('VRAM e, no empate, desempenho', () => {
    expect(slugs(applyCriteria(catalog, { sort: 'vram', resolution: '1440p' })).slice(0, 3)).toEqual(['rtx-5090', 'rtx-5080', 'rtx-5070-ti']);
  });

  it('consumo, do menor para o maior', () => {
    const list = slugs(applyCriteria(catalog, { sort: 'power' }));
    expect(list[0]).toBe('rtx-5050');
    expect(list.at(-1)).toBe('rtx-5090');
  });
});

describe('evaluate — explica a decisão em linguagem simples', () => {
  it('monitor, VRAM e fonte', () => {
    const e = evaluate(gpu('rtx-5080'), { resolution: '1440p', refreshRate: 144, games: ['cyberpunk-2077'], minVram: 12, psuWatts: 750 }, catalog);
    expect(e.fit).toBe('playable');
    expect(e.passes).toBe(false);
    expect(e.reasons).toEqual([
      { key: 'monitor', ok: true, text: 'Jogável: Cyberpunk 2077 a 137,6 FPS em 1440p (monitor de 144 Hz)' },
      { key: 'vram', ok: true, text: '16 GB de VRAM (mínimo 12 GB)' },
      { key: 'psu', ok: false, text: 'Pede fonte de 850 W (a sua: 750 W)' },
    ]);
  });

  it('evaluateAll devolve também as que não passam (útil para "quase lá" no assistente)', () => {
    const all = evaluateAll(catalog, { psuWatts: 650 });
    expect(all).toHaveLength(8);
    expect(all.filter((e) => !e.passes).map((e) => e.gpu.slug)).toEqual(['rtx-5070-ti', 'rtx-5080', 'rtx-5090']);
  });
});
