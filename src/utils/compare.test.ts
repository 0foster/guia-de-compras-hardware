import { describe, it, expect } from 'vitest';
import { buildCatalog } from './catalog';
import {
  compareSpecs,
  compareAverageFps,
  compareGames,
  verdict,
  verdictSentences,
  parseCompareParam,
  compareUrl,
  resolveSelection,
  diffPct,
} from './compare';

const catalog = buildCatalog();
const pick = (...slugs: string[]) => slugs.map((s) => catalog.gpus.find((g) => g.slug === s)!);
const trio = pick('rtx-5070', 'rtx-5070-ti', 'rtx-5080');
const row = (groups: ReturnType<typeof compareSpecs>, key: string) => groups.flatMap((g) => g.rows).find((r) => r.key === key)!;

describe('diffPct', () => {
  it('arredonda a diferença percentual', () => {
    expect(diffPct(133.1, 108.4)).toBe(23);
    expect(diffPct(100, 100)).toBe(0);
    expect(diffPct(250, 300)).toBe(-17);
  });
});

describe('compareSpecs', () => {
  const specs = compareSpecs(trio);

  it('agrupa as especificações', () => {
    expect(specs.map((g) => g.label)).toEqual(['Memória', 'Desempenho', 'Energia', 'Conectividade']);
  });

  it('mais VRAM vence, com empate destacando as duas', () => {
    const vram = row(specs, 'vram');
    expect(vram.cells.map((c) => c.text)).toEqual(['12 GB GDDR7', '16 GB GDDR7', '16 GB GDDR7']);
    expect(vram.cells.map((c) => c.isBest)).toEqual([false, true, true]);
    expect(vram.cells.map((c) => c.diffPct)).toEqual([undefined, 33, 33]);
  });

  it('menos consumo vence', () => {
    const tdp = row(specs, 'tdp');
    expect(tdp.cells.map((c) => c.isBest)).toEqual([true, false, false]);
    expect(row(specs, 'recommendedPsu').cells.map((c) => c.text)).toEqual(['650 W', '750 W', '850 W']);
  });

  it('linhas iguais não destacam ninguém e são marcadas como iguais', () => {
    for (const key of ['pciExpress', 'hdmi', 'displayPort', 'totalOutputs']) {
      const r = row(specs, key);
      expect(r.allEqual).toBe(true);
      expect(r.cells.every((c) => !c.isBest)).toBe(true);
    }
  });

  it('linhas de texto não têm diferença percentual', () => {
    expect(row(specs, 'hdmi').cells.every((c) => c.diffPct === undefined)).toBe(true);
  });

  it('formata números no padrão brasileiro', () => {
    expect(row(specs, 'cudaCores').cells[0].text).toBe('6.144');
  });
});

describe('compareAverageFps', () => {
  it('uma linha por resolução, % sobre a 1ª placa', () => {
    const rows = compareAverageFps(trio);
    expect(rows.map((r) => r.label)).toEqual(['1080p', '1440p', '4K']);
    const r1440 = rows[1];
    expect(r1440.cells.map((c) => c.text)).toEqual(['108,4', '133,1', '149,1']);
    expect(r1440.cells.map((c) => c.diffPct)).toEqual([undefined, 23, 38]);
    expect(r1440.cells.map((c) => c.isBest)).toEqual([false, false, true]);
  });
});

describe('compareGames', () => {
  it('agrupa os 24 jogos por tipo, na resolução pedida', () => {
    const groups = compareGames(trio, catalog, '1440p');
    expect(groups.map((g) => g.key)).toEqual(['tiro', 'rpg', 'acao-aventura', 'terror', 'corrida']);
    expect(groups.reduce((n, g) => n + g.rows.length, 0)).toBe(24);
    const cs2 = groups[0].rows.find((r) => r.key === 'counter-strike-2')!;
    expect(cs2.cells.map((c) => c.text)).toEqual(['298,8', '358,7', '407,1']);
    expect(cs2.cells.map((c) => c.diffPct)).toEqual([undefined, 20, 36]);
  });
});

describe('verdict', () => {
  it('aponta a mais rápida, a mais econômica e a de mais VRAM (o exemplo do desenho)', () => {
    const v = verdict(trio, '1440p');
    expect(v.fastest?.gpus.map((g) => g.slug)).toEqual(['rtx-5080']);
    expect(v.fastest?.pctOverSlowest).toBe(38);
    expect(v.leastPower).toMatchObject({ tdp: 250, psu: 650 });
    expect(v.mostVram?.gpus.map((g) => g.slug)).toEqual(['rtx-5070-ti', 'rtx-5080']);
    expect(verdictSentences(v)).toEqual([
      'Mais rápida em 1440p: RTX 5080, 38% acima da RTX 5070.',
      'Mais econômica: RTX 5070 (250 W, fonte de 650 W).',
      'Mais VRAM: RTX 5070 Ti e RTX 5080 (16 GB).',
    ]);
  });

  it('omite o que empata (5060 Ti 8 GB x 16 GB: mesmo consumo)', () => {
    const v = verdict(pick('rtx-5060-ti-8gb', 'rtx-5060-ti'), '4K');
    expect(v.leastPower).toBeNull();
    expect(v.fastest?.gpus.map((g) => g.slug)).toEqual(['rtx-5060-ti']);
    expect(v.mostVram?.vram).toBe(16);
  });
});

describe('seleção pela URL', () => {
  it('lê slugs válidos, sem repetir, no máximo 3, na ordem pedida', () => {
    expect(parseCompareParam('rtx-5080,rtx-5070,rtx-5080,rtx-9999,rtx-5050,rtx-5090', catalog)).toEqual([
      'rtx-5080',
      'rtx-5070',
      'rtx-5050',
    ]);
    expect(parseCompareParam(null, catalog)).toEqual([]);
  });

  it('monta a URL de comparação', () => {
    expect(compareUrl(['rtx-5070', 'rtx-5080'])).toBe('/comparar?gpus=rtx-5070,rtx-5080');
  });

  it('usa a comparação padrão quando há menos de 2 placas válidas', () => {
    expect(resolveSelection('rtx-5090', catalog).map((g) => g.slug)).toEqual(['rtx-5070', 'rtx-5070-ti']);
    expect(resolveSelection('rtx-5090,rtx-5050', catalog).map((g) => g.slug)).toEqual(['rtx-5090', 'rtx-5050']);
  });
});
