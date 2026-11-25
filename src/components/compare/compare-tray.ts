import { compareUrl, MAX_COMPARE, MIN_COMPARE } from '../../utils/compare';
import { COMPARE_STORAGE_KEY, createCompareStore, safeLocalStorage } from '../../utils/compare-store';

function initCompareTray() {
  const tray = document.querySelector<HTMLElement>('[data-compare-tray]');
  if (!tray) return;

  const names: Record<string, string> = JSON.parse(tray.dataset.names ?? '{}');
  const title = tray.querySelector<HTMLElement>('[data-tray-title]')!;
  const chips = tray.querySelector<HTMLElement>('[data-tray-chips]')!;
  const hint = tray.querySelector<HTMLElement>('[data-tray-hint]')!;
  const go = tray.querySelector<HTMLAnchorElement>('[data-tray-go]')!;
  const clear = tray.querySelector<HTMLButtonElement>('[data-tray-clear]')!;

  const store = createCompareStore(safeLocalStorage(), Object.keys(names), () => render());
  let flash = '';

  function defaultHint(n: number): string {
    if (n === 1) return 'Escolha mais uma placa para comparar.';
    if (n >= MAX_COMPARE) return `Máximo de ${MAX_COMPARE} placas.`;
    return '';
  }

  function render() {
    const slugs = store.get();
    const visible = slugs.length > 0;
    tray!.classList.toggle('hidden', !visible);
    // Evita que a barra cubra o fim da página.
    document.body.style.paddingBottom = visible ? `${tray!.offsetHeight + 8}px` : '';

    title.textContent = `Comparar (${slugs.length} de ${MAX_COMPARE})`;
    chips.innerHTML = '';
    slugs.forEach((slug) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.trayRemove = slug;
      btn.className =
        'inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300';
      btn.setAttribute('aria-label', `Tirar ${names[slug]} da comparação`);
      btn.append(names[slug] ?? slug);
      const x = document.createElement('span');
      x.setAttribute('aria-hidden', 'true');
      x.textContent = '×';
      btn.append(x);
      chips.append(btn);
    });

    hint.textContent = flash || defaultHint(slugs.length);
    flash = '';

    const ready = slugs.length >= MIN_COMPARE;
    go.href = ready ? compareUrl(slugs) : '/comparar';
    if (ready) go.removeAttribute('aria-disabled');
    else go.setAttribute('aria-disabled', 'true');

    document.querySelectorAll<HTMLButtonElement>('[data-compare-toggle]').forEach((btn) => {
      const selected = slugs.includes(btn.dataset.compareToggle ?? '');
      btn.setAttribute('aria-pressed', String(selected));
      btn.textContent = selected ? (btn.dataset.labelAdded ?? '✓ Comparando') : (btn.dataset.labelAdd ?? '+ Comparar');
    });
  }

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    const toggle = target.closest<HTMLButtonElement>('[data-compare-toggle]');
    if (toggle) {
      e.preventDefault();
      const result = store.toggle(toggle.dataset.compareToggle ?? '');
      if (result === 'full') {
        flash = `Máximo de ${MAX_COMPARE} placas. Tire uma para adicionar outra.`;
        render();
      }
      return;
    }

    const remove = target.closest<HTMLButtonElement>('[data-tray-remove]');
    if (remove) store.remove(remove.dataset.trayRemove ?? '');
  });

  clear.addEventListener('click', () => store.clear());

  // Mantém abas abertas do site em sincronia.
  window.addEventListener('storage', (e) => {
    if (e.key === COMPARE_STORAGE_KEY) render();
  });

  render();
}

document.addEventListener('DOMContentLoaded', initCompareTray);
