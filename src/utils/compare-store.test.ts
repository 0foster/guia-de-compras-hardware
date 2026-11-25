import { describe, it, expect, vi } from 'vitest';
import { createCompareStore, COMPARE_STORAGE_KEY } from './compare-store';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

const VALID = ['rtx-5050', 'rtx-5060', 'rtx-5070', 'rtx-5080', 'rtx-5090'];

describe('createCompareStore', () => {
  it('adiciona e remove placas, guardando no navegador', () => {
    const storage = memoryStorage();
    const store = createCompareStore(storage, VALID);
    expect(store.toggle('rtx-5070')).toBe('added');
    expect(store.toggle('rtx-5080')).toBe('added');
    expect(store.get()).toEqual(['rtx-5070', 'rtx-5080']);
    expect(JSON.parse(storage.data[COMPARE_STORAGE_KEY])).toEqual(['rtx-5070', 'rtx-5080']);
    expect(store.toggle('rtx-5070')).toBe('removed');
    expect(store.get()).toEqual(['rtx-5080']);
  });

  it('não passa de 3 placas', () => {
    const store = createCompareStore(memoryStorage(), VALID);
    ['rtx-5050', 'rtx-5060', 'rtx-5070'].forEach((s) => store.toggle(s));
    expect(store.toggle('rtx-5090')).toBe('full');
    expect(store.get()).toHaveLength(3);
  });

  it('ignora dados corrompidos ou placas que não existem mais', () => {
    expect(createCompareStore(memoryStorage({ [COMPARE_STORAGE_KEY]: '{oops' }), VALID).get()).toEqual([]);
    expect(createCompareStore(memoryStorage({ [COMPARE_STORAGE_KEY]: '["rtx-9999","rtx-5070","rtx-5070"]' }), VALID).get()).toEqual(['rtx-5070']);
  });

  it('sem armazenamento disponível, funciona só em memória', () => {
    const store = createCompareStore(null, VALID);
    store.toggle('rtx-5070');
    expect(store.get()).toEqual(['rtx-5070']);
  });

  it('se gravar falhar, mantém em memória sem quebrar', () => {
    const broken = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    const store = createCompareStore(broken, VALID);
    expect(() => store.toggle('rtx-5070')).not.toThrow();
    expect(store.get()).toEqual(['rtx-5070']);
  });

  it('avisa quando a seleção muda', () => {
    const onChange = vi.fn();
    const store = createCompareStore(memoryStorage(), VALID, onChange);
    store.toggle('rtx-5070');
    store.clear();
    expect(onChange).toHaveBeenNthCalledWith(1, ['rtx-5070']);
    expect(onChange).toHaveBeenNthCalledWith(2, []);
  });
});
