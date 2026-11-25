import { describe, it, expect } from 'vitest';
import { buildCatalog } from './catalog';
import { criteriaToQuery, queryToCriteria, describeCriteria, removeFilter } from './criteria-url';
import type { Criteria } from './criteria';

const catalog = buildCatalog();

const example: Criteria = {
  resolutions: ['1440p'],
  game: 'cyberpunk-2077',
  minFps: 60,
  minVram: 12,
  psuWatts: 750,
  sort: 'performance',
};

describe('criteriaToQuery / queryToCriteria', () => {
  it('gera um link legível', () => {
    expect(criteriaToQuery(example)).toBe('res=1440p&jogo=cyberpunk-2077&fps=60&vram=12&fonte=750&ordem=performance');
  });

  it('ida e volta preserva os critérios', () => {
    expect(queryToCriteria(criteriaToQuery(example), catalog)).toEqual(example);
  });

  it('valores padrão ficam fora do link', () => {
    expect(criteriaToQuery({ resolutions: [], minVram: 0, minFps: 0, psuWatts: 0, sort: 'catalog' })).toBe('');
  });

  it('várias resoluções separadas por vírgula', () => {
    expect(criteriaToQuery({ resolutions: ['1080p', '4K'] })).toBe('res=1080p,4K');
    expect(queryToCriteria('res=1080p,4K', catalog).resolutions).toEqual(['1080p', '4K']);
  });

  it('ignora valores inválidos', () => {
    expect(queryToCriteria('res=8K,1440p&jogo=nao-existe&tipo=mmo&fps=100&vram=-4&fonte=abc&ordem=preco', catalog)).toEqual({
      resolutions: ['1440p'],
    });
  });

  it('aceita tipo de jogo válido', () => {
    expect(queryToCriteria('tipo=rpg&fps=144', catalog)).toEqual({ category: 'rpg', minFps: 144 });
  });
});

describe('describeCriteria / removeFilter', () => {
  it('descreve os filtros ativos em etiquetas', () => {
    expect(describeCriteria({ ...example, category: 'tiro' }, catalog)).toEqual([
      { key: 'res:1440p', label: '1440p' },
      { key: 'jogo', label: 'Cyberpunk 2077' },
      { key: 'tipo', label: 'Tiro (FPS)' },
      { key: 'fps', label: '60+ FPS' },
      { key: 'vram', label: '12 GB+ de VRAM' },
      { key: 'fonte', label: 'Fonte de 750 W' },
    ]);
  });

  it('sem filtros, sem etiquetas (a ordenação não conta)', () => {
    expect(describeCriteria({ sort: 'vram' }, catalog)).toEqual([]);
  });

  it('remove um filtro pela etiqueta', () => {
    expect(removeFilter(example, 'jogo').game).toBeUndefined();
    expect(removeFilter({ resolutions: ['1080p', '4K'] }, 'res:4K').resolutions).toEqual(['1080p']);
    expect(removeFilter(example, 'fonte')).not.toHaveProperty('psuWatts');
  });
});
