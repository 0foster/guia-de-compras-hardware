import type { Catalog } from '../../utils/catalog';
import { RESOLUTIONS, type Resolution } from '../../utils/games';
import { compareUrl, resolveSelection, MAX_COMPARE, MIN_COMPARE } from '../../utils/compare';
import { renderCompare, type CompareState } from '../../utils/compare-render';

const catalog = (window as unknown as { __GPU_CATALOG__?: Catalog }).__GPU_CATALOG__;

function initCompare() {
  const root = document.getElementById('compare-root');
  if (!root || !catalog) return;

  const params = new URLSearchParams(window.location.search);
  const slugs = resolveSelection(params.get('gpus'), catalog).map((g) => g.slug);
  const resParam = params.get('res') as Resolution | null;
  const firstIdeal = catalog.gpus.find((g) => g.slug === slugs[0])?.targetResolution[0] ?? '1440p';

  const state: CompareState = {
    slugs,
    res: resParam && RESOLUTIONS.includes(resParam) ? resParam : firstIdeal,
    onlyDiff: false,
  };

  function render() {
    root!.innerHTML = renderCompare(state, catalog!);
    const url = `${compareUrl(state.slugs)}&res=${state.res}`;
    window.history.replaceState(null, '', url);
    const names = state.slugs.map((s) => catalog!.gpus.find((g) => g.slug === s)?.shortName).join(' vs ');
    document.title = `${names} — Comparativo | Guia de Compras Hardware`;
  }

  root.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    const action = el.dataset.action;
    const index = Number(el.dataset.index);

    if (action === 'swap' && el.value) {
      state.slugs[index] = el.value;
    } else if (action === 'add' && el.value && state.slugs.length < MAX_COMPARE) {
      state.slugs.push(el.value);
    } else if (action === 'diff') {
      state.onlyDiff = (el as HTMLInputElement).checked;
    } else {
      return;
    }
    render();
  });

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!btn) return;
    const index = Number(btn.dataset.index);

    switch (btn.dataset.action) {
      case 'remove':
        if (state.slugs.length > MIN_COMPARE) state.slugs.splice(index, 1);
        break;
      case 'ref': {
        const [chosen] = state.slugs.splice(index, 1);
        state.slugs.unshift(chosen);
        break;
      }
      case 'res':
        state.res = btn.dataset.res as Resolution;
        break;
      default:
        return;
    }
    render();
  });

  render();
}

document.addEventListener('DOMContentLoaded', initCompare);
