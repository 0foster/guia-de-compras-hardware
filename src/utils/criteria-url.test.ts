import { describe, it, expect } from 'vitest';
import { buildCatalog } from './catalog';
import { criteriaToQuery, queryToCriteria, describeCriteria, removeFilter } from './criteria-url';
import type { Criteria } from './criteria';

const catalog = buildCatalog();

const example: Criteria = {
  resolution: '1440p',
  refreshRate: 144,
  games: ['counter-strike-2', 'cyberpunk-2077'],
  minVram: 12,
  psuWatts: 750,
  sort: 'performance',
};

describe('criteriaToQuery / queryToCriteria', () => {
  it('gera um link legível', () => {
    expect(criteriaToQuery(example)).toBe('res=1440p&hz=144&jogos=counter-strike-2,cyberpunk-2077&vram=12&fonte=750&ordem=performance');
  });

  it('ida e volta preserva os critérios', () => {
    expect(queryToCriteria(criteriaToQuery(example), catalog)).toEqual(example);
  });

  it('valores padrão ficam fora do link', () => {
    expect(criteriaToQuery({ minVram: 0, psuWatts: 0, games: [] })).toBe('');
  });

  it('ignora valores inválidos', () => {
    expect(queryToCriteria('res=8K&hz=100&jogos=nao-existe,f1-24&tipo=mmo&vram=-4&fonte=abc&ordem=preco', catalog)).toEqual({
      games: ['f1-24'],
    });
  });

  it('aceita tipo de jogo válido', () => {
    expect(queryToCriteria('tipo=rpg&hz=240', catalog)).toEqual({ category: 'rpg', refreshRate: 240 });
  });

  it('links antigos continuam funcionando', () => {
    // versão anterior: várias resoluções, um jogo em "jogo" e meta em "fps"
    expect(queryToCriteria('res=1080p,4K&jogo=cyberpunk-2077&fps=144', catalog)).toEqual({
      resolution: '1080p',
      refreshRate: 144,
      games: ['cyberpunk-2077'],
    });
  });
});

describe('describeCriteria / removeFilter', () => {
  it('descreve os filtros ativos em etiquetas', () => {
    expect(describeCriteria({ ...example, category: 'tiro' }, catalog)).toEqual([
      { key: 'res', label: 'Monitor 1440p' },
      { key: 'hz', label: '144 Hz' },
      { key: 'jogo:counter-strike-2', label: 'Counter-Strike 2' },
      { key: 'jogo:cyberpunk-2077', label: 'Cyberpunk 2077' },
      { key: 'tipo', label: 'Tiro (FPS)' },
      { key: 'vram', label: '12 GB+ de VRAM' },
      { key: 'fonte', label: 'Fonte de 750 W' },
    ]);
  });

  it('sem filtros, sem etiquetas (a ordenação não conta)', () => {
    expect(describeCriteria({ sort: 'vram' }, catalog)).toEqual([]);
  });

  it('remove um filtro pela etiqueta', () => {
    expect(removeFilter(example, 'jogo:cyberpunk-2077').games).toEqual(['counter-strike-2']);
    expect(removeFilter({ games: ['f1-24'] }, 'jogo:f1-24')).not.toHaveProperty('games');
    expect(removeFilter(example, 'hz')).not.toHaveProperty('refreshRate');
    expect(removeFilter(example, 'res')).not.toHaveProperty('resolution');
  });
});
