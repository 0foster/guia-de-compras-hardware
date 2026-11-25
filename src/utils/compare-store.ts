/**
 * Placas escolhidas para comparar, guardadas no navegador do visitante.
 *
 * É só uma conveniência: se o armazenamento não existir ou falhar (aba anônima,
 * dados bloqueados), a seleção vive apenas enquanto a página estiver aberta.
 */
import { MAX_COMPARE } from './compare';

export const COMPARE_STORAGE_KEY = 'gch:compare';
export const COMPARE_CHANGE_EVENT = 'compare-change';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export type ToggleResult = 'added' | 'removed' | 'full';

export interface CompareStore {
  get(): string[];
  set(slugs: string[]): void;
  toggle(slug: string): ToggleResult;
  remove(slug: string): void;
  clear(): void;
}

function sanitize(value: unknown, validSlugs?: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || out.includes(item)) continue;
    if (validSlugs && !validSlugs.has(item)) continue;
    out.push(item);
    if (out.length === MAX_COMPARE) break;
  }
  return out;
}

export function createCompareStore(storage: StorageLike | null, validSlugs?: string[], onChange?: (slugs: string[]) => void): CompareStore {
  const valid = validSlugs ? new Set(validSlugs) : undefined;
  let memory: string[] = [];
  let usable = Boolean(storage);

  const read = (): string[] => {
    if (!storage || !usable) return memory;
    try {
      return sanitize(JSON.parse(storage.getItem(COMPARE_STORAGE_KEY) ?? '[]'), valid);
    } catch {
      return memory;
    }
  };

  const write = (slugs: string[]) => {
    memory = sanitize(slugs, valid);
    if (storage && usable) {
      try {
        storage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(memory));
      } catch {
        usable = false; // armazenamento indisponível: passa a usar só a memória
      }
    }
    onChange?.(memory);
  };

  return {
    get: read,
    set: write,
    toggle(slug) {
      const current = read();
      if (current.includes(slug)) {
        write(current.filter((s) => s !== slug));
        return 'removed';
      }
      if (current.length >= MAX_COMPARE) return 'full';
      write([...current, slug]);
      return 'added';
    },
    remove(slug) {
      write(read().filter((s) => s !== slug));
    },
    clear() {
      write([]);
    },
  };
}

/** Acesso seguro ao localStorage (pode lançar erro em alguns navegadores). */
export function safeLocalStorage(): StorageLike | null {
  try {
    const s = window.localStorage;
    const probe = '__gch_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
