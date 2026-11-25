import {
  applyCriteria,
  FIT_LABELS,
  hasMonitor,
  recommend,
  REFRESH_RATES,
  SORT_KEYS,
  type Criteria,
  type Evaluation,
  type FitLevel,
  type SortKey,
} from '../../utils/criteria';
import type { Catalog } from '../../utils/catalog';
import { RESOLUTIONS, type Resolution } from '../../utils/games';
import { formatFps } from '../../utils/format';
import { criteriaToQuery, describeCriteria, queryToCriteria, removeFilter } from '../../utils/criteria-url';

/** Catálogo das GPUs embutido na página pelo index.astro. */
const catalog = (window as unknown as { __GPU_CATALOG__?: Catalog }).__GPU_CATALOG__;

type FilterControl = HTMLInputElement | HTMLSelectElement;

const isSelect = (el: FilterControl): el is HTMLSelectElement => el.tagName === 'SELECT';

function fpsColor(value: number): string {
  if (value >= 144) return 'text-green-600 dark:text-green-500';
  if (value >= 60) return 'text-yellow-600 dark:text-yellow-500';
  return 'text-red-600 dark:text-red-500';
}

const FIT_PILL: Record<FitLevel, string> = {
  ideal: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  surplus: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  playable: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  insufficient: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

function initFilters() {
  const grid = document.getElementById('gpu-grid');
  const cards = document.querySelectorAll<HTMLElement>('.gpu-card');
  const controls = document.querySelectorAll<FilterControl>('[data-filter]');
  const clearBtns = document.querySelectorAll<HTMLButtonElement>('[data-filter-role="clear-filters"]');
  const resultsCount = document.querySelector<HTMLElement>('[data-filter-role="results-count"]');
  const activeFilters = document.querySelector<HTMLElement>('[data-filter-role="active-filters"]');
  const gamesCounts = document.querySelectorAll<HTMLElement>('[data-filter-role="games-count"]');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const mobileFilterBtn = document.getElementById('mobile-filter-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileOverlay = document.getElementById('mobile-overlay');
  const mobileClose = document.getElementById('mobile-drawer-close');

  /** Os controles existem duas vezes (sidebar e gaveta mobile): mantém as cópias iguais. */
  function syncControl(changed: FilterControl) {
    controls.forEach((other) => {
      if (other === changed || other.dataset.filter !== changed.dataset.filter) return;
      if (isSelect(other)) {
        other.value = changed.value;
      } else if (!isSelect(changed) && other.value === changed.value) {
        other.checked = changed.checked;
      }
    });
  }

  /** Lê os controles e monta os critérios (valores repetidos das cópias são ignorados). */
  function readCriteria(): Criteria {
    const c: Criteria = {};
    const games = new Set<string>();

    controls.forEach((el) => {
      const value = el.value;
      if (!isSelect(el) && !el.checked) return;
      switch (el.dataset.filter) {
        case 'resolution':
          if (RESOLUTIONS.includes(value as Resolution)) c.resolution = value as Resolution;
          break;
        case 'hz': {
          const hz = parseInt(value, 10);
          if ((REFRESH_RATES as readonly number[]).includes(hz)) c.refreshRate = hz;
          break;
        }
        case 'game':
          if (value) games.add(value);
          break;
        case 'category':
          if (value) c.category = value;
          break;
        case 'vram':
          if (parseInt(value, 10) > 0) c.minVram = parseInt(value, 10);
          break;
        case 'psu':
          if (parseInt(value, 10) > 0) c.psuWatts = parseInt(value, 10);
          break;
        case 'sort':
          if ((SORT_KEYS as readonly string[]).includes(value)) c.sort = value as SortKey;
          break;
      }
    });

    if (games.size) c.games = [...games];
    return c;
  }

  /** Ajusta os controles (nas duas cópias) para refletir os critérios. */
  function setControls(c: Criteria) {
    controls.forEach((el) => {
      const filter = el.dataset.filter;
      if (isSelect(el)) {
        let value = el.value;
        if (filter === 'psu') value = String(c.psuWatts ?? 0);
        else if (filter === 'sort') value = c.sort ?? '';
        if (![...el.options].some((o) => o.value === value)) {
          // Valor vindo de um link que não está entre as opções (ex.: fonte de 700 W).
          el.add(new Option(filter === 'psu' ? `${value} W` : value, value));
        }
        el.value = value;
      } else if (el.type === 'checkbox') {
        if (filter === 'game') el.checked = (c.games ?? []).includes(el.value);
      } else if (el.type === 'radio') {
        if (filter === 'resolution') el.checked = el.value === (c.resolution ?? '');
        else if (filter === 'hz') el.checked = el.value === String(c.refreshRate ?? 0);
        else if (filter === 'vram') el.checked = el.value === String(c.minVram ?? 0);
        else if (filter === 'category') el.checked = el.value === (c.category ?? '');
      }
    });
  }

  /** O card mostra a situação e o FPS de referência quando há monitor, jogos ou tipo escolhidos. */
  function showsMetric(c: Criteria): boolean {
    return Boolean(hasMonitor(c) || c.games?.length || c.category);
  }

  function updateCard(card: HTMLElement, evaluation: Evaluation | undefined, showMetric: boolean, badge: string) {
    const metricEl = card.querySelector<HTMLElement>('[data-card-metric]');
    const badgeEl = card.querySelector<HTMLElement>('[data-card-recommended]');

    if (badgeEl) {
      badgeEl.textContent = badge;
      badgeEl.classList.toggle('hidden', !badge);
    }
    card.classList.toggle('ring-2', Boolean(badge));
    card.classList.toggle('ring-green-600', Boolean(badge));

    // As etiquetas fixas (resolução ideal e FPS nela) saem quando a situação no monitor aparece.
    card.querySelectorAll<HTMLElement>('[data-card-static]').forEach((el) => el.classList.toggle('hidden', showMetric));

    if (!metricEl) return;
    if (!evaluation || !showMetric) {
      metricEl.classList.add('hidden');
      return;
    }

    const { label, resolution, value, worst } = evaluation.metric;
    metricEl.innerHTML = '';

    if (evaluation.fit) {
      const pill = document.createElement('span');
      pill.className = `inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${FIT_PILL[evaluation.fit]}`;
      pill.textContent = FIT_LABELS[evaluation.fit];
      metricEl.append(pill);
    }

    const line = document.createElement('p');
    line.append(`${label.charAt(0).toUpperCase()}${label.slice(1)} em ${resolution}: `);
    const strong = document.createElement('strong');
    strong.className = fpsColor(value);
    strong.textContent = `${formatFps(value)} FPS`;
    line.append(strong);
    metricEl.append(line);

    if (worst) {
      const w = document.createElement('p');
      w.className = 'text-xs text-gray-500 dark:text-gray-400';
      w.textContent = `Mais pesado: ${worst.name} (${formatFps(worst.value)} FPS)`;
      metricEl.append(w);
    }

    metricEl.classList.remove('hidden');
  }

  function applyFilters() {
    if (!catalog) return;
    const criteria = readCriteria();
    const results = applyCriteria(catalog, criteria);
    const bySlug = new Map(results.map((e) => [e.gpu.slug, e]));
    const showMetric = showsMetric(criteria);
    const rec = recommend(results);

    // Reordena os cards na ordem pedida; os que não passam ficam escondidos no fim.
    const cardBySlug = new Map([...cards].map((c) => [c.dataset.slug ?? '', c]));
    results.forEach((e) => {
      const card = cardBySlug.get(e.gpu.slug);
      if (card) grid?.append(card);
    });
    cards.forEach((card) => {
      const slug = card.dataset.slug ?? '';
      const evaluation = bySlug.get(slug);
      card.classList.toggle('hidden', !evaluation);
      if (!evaluation) grid?.append(card);
      const badge =
        rec && rec.evaluation.gpu.slug === slug
          ? rec.kind === 'recommended'
            ? 'Recomendada para você'
            : 'A mais próxima do seu monitor'
          : '';
      updateCard(card, evaluation, showMetric, badge);
    });

    if (resultsCount) {
      const n = results.length;
      resultsCount.innerHTML = '';
      const strong = document.createElement('span');
      strong.className = 'font-semibold text-gray-900 dark:text-gray-100';
      strong.textContent = String(n);
      resultsCount.append(strong, n === 1 ? ' placa' : ' placas');
      if (hasMonitor(criteria)) resultsCount.append(' para o seu monitor');
    }

    const nGames = criteria.games?.length ?? 0;
    gamesCounts.forEach((el) => (el.textContent = nGames ? `(${nGames})` : ''));

    renderActiveFilters(criteria);

    const query = criteriaToQuery(criteria);
    const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', url);

    const noResults = document.getElementById('no-results');
    noResults?.classList.toggle('hidden', results.length > 0);
  }

  /** Etiquetas dos filtros ativos, cada uma com "×" para remover. */
  function renderActiveFilters(criteria: Criteria) {
    if (!activeFilters || !catalog) return;
    const chips = describeCriteria(criteria, catalog);
    activeFilters.innerHTML = '';
    activeFilters.classList.toggle('hidden', chips.length === 0);
    activeFilters.classList.toggle('flex', chips.length > 0);
    chips.forEach((chip) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.removeFilter = chip.key;
      btn.className =
        'inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300';
      btn.setAttribute('aria-label', `Remover filtro: ${chip.label}`);
      btn.append(chip.label);
      const x = document.createElement('span');
      x.setAttribute('aria-hidden', 'true');
      x.textContent = '×';
      btn.append(x);
      activeFilters.append(btn);
    });
  }

  activeFilters?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-filter]');
    if (!btn) return;
    setControls(removeFilter(readCriteria(), btn.dataset.removeFilter ?? ''));
    applyFilters();
  });

  controls.forEach((el) => {
    el.addEventListener('change', () => {
      syncControl(el);
      applyFilters();
    });
  });

  clearBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      setControls({});
      applyFilters();
    });
  });

  // Abre já filtrado quando o link traz filtros (ex.: link compartilhado ou vindo do assistente).
  if (catalog && window.location.search) {
    setControls(queryToCriteria(window.location.search, catalog));
  }
  applyFilters();

  // Desktop sidebar toggle
  sidebarToggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('sidebar-collapsed');
    const isCollapsed = sidebar?.classList.contains('sidebar-collapsed');
    const icon = sidebarToggle.querySelector('.toggle-icon');
    if (icon) {
      icon.textContent = isCollapsed ? '>' : '<';
    }
    const label = sidebarToggle.querySelector('.toggle-label');
    if (label) {
      label.textContent = isCollapsed ? 'Mostrar filtros' : 'Retrair';
    }
  });

  // Mobile drawer
  function openDrawer() {
    mobileDrawer?.classList.remove('-translate-x-full');
    mobileOverlay?.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }

  function closeDrawer() {
    mobileDrawer?.classList.add('-translate-x-full');
    mobileOverlay?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  mobileFilterBtn?.addEventListener('click', openDrawer);
  mobileClose?.addEventListener('click', closeDrawer);
  mobileOverlay?.addEventListener('click', closeDrawer);
}

document.addEventListener('DOMContentLoaded', initFilters);
