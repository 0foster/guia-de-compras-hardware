import { applyCriteria, SORT_KEYS, type Criteria, type Evaluation, type SortKey } from '../../utils/criteria';
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

function initFilters() {
  const grid = document.getElementById('gpu-grid');
  const cards = document.querySelectorAll<HTMLElement>('.gpu-card');
  const controls = document.querySelectorAll<FilterControl>('[data-filter]');
  const clearBtns = document.querySelectorAll<HTMLButtonElement>('[data-filter-role="clear-filters"]');
  const resultsCount = document.querySelector<HTMLElement>('[data-filter-role="results-count"]');
  const activeFilters = document.querySelector<HTMLElement>('[data-filter-role="active-filters"]');
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
    const resolutions = new Set<Resolution>();
    const criteria: Criteria = {};

    controls.forEach((el) => {
      const value = el.value;
      if (!isSelect(el) && !el.checked) return;
      switch (el.dataset.filter) {
        case 'resolution':
          if (RESOLUTIONS.includes(value as Resolution)) resolutions.add(value as Resolution);
          break;
        case 'vram':
          criteria.minVram = parseInt(value, 10) || 0;
          break;
        case 'game':
          if (value) criteria.game = value;
          break;
        case 'category':
          if (value) criteria.category = value;
          break;
        case 'fps':
          criteria.minFps = parseInt(value, 10) || 0;
          break;
        case 'psu':
          criteria.psuWatts = parseInt(value, 10) || 0;
          break;
        case 'sort':
          if ((SORT_KEYS as readonly string[]).includes(value)) criteria.sort = value as SortKey;
          break;
      }
    });

    criteria.resolutions = [...resolutions];
    return criteria;
  }

  /** O card mostra o FPS do critério escolhido quando ele é diferente do padrão. */
  function showsMetric(criteria: Criteria): boolean {
    return Boolean(criteria.game || criteria.category || criteria.minFps || criteria.resolutions?.length === 1);
  }

  function updateCardMetric(card: HTMLElement, evaluation: Evaluation | undefined, visible: boolean) {
    const el = card.querySelector<HTMLElement>('[data-card-metric]');
    if (!el) return;
    if (!evaluation || !visible) {
      el.classList.add('hidden');
      return;
    }
    const { label, resolution, value } = evaluation.metric;
    el.innerHTML = '';
    el.append(`${label.charAt(0).toUpperCase()}${label.slice(1)} em ${resolution}: `);
    const strong = document.createElement('strong');
    strong.className = fpsColor(value);
    strong.textContent = `${formatFps(value)} FPS`;
    el.append(strong);
    el.classList.remove('hidden');
  }

  function applyFilters() {
    if (!catalog) return;
    const criteria = readCriteria();
    const results = applyCriteria(catalog, criteria);
    const bySlug = new Map(results.map((e) => [e.gpu.slug, e]));
    const metricVisible = showsMetric(criteria);

    // Reordena os cards na ordem pedida; os que não passam ficam escondidos no fim.
    const cardBySlug = new Map([...cards].map((c) => [c.dataset.slug ?? '', c]));
    results.forEach((e) => {
      const card = cardBySlug.get(e.gpu.slug);
      if (card) grid?.append(card);
    });
    cards.forEach((card) => {
      const evaluation = bySlug.get(card.dataset.slug ?? '');
      card.classList.toggle('hidden', !evaluation);
      if (!evaluation) grid?.append(card);
      updateCardMetric(card, evaluation, metricVisible);
    });

    if (resultsCount) {
      const n = results.length;
      resultsCount.innerHTML = '';
      const strong = document.createElement('span');
      strong.className = 'font-semibold text-gray-900 dark:text-gray-100';
      strong.textContent = String(n);
      resultsCount.append(strong, n === 1 ? ' placa atende' : ' placas atendem');
    }

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

  /** Ajusta os controles (nas duas cópias) para refletir os critérios. */
  function setControls(c: Criteria) {
    controls.forEach((el) => {
      const filter = el.dataset.filter;
      if (isSelect(el)) {
        let value = el.value;
        if (filter === 'game') value = c.game ?? '';
        else if (filter === 'psu') value = String(c.psuWatts ?? 0);
        else if (filter === 'sort') value = c.sort ?? 'catalog';
        if (![...el.options].some((o) => o.value === value)) {
          // Valor vindo de um link que não está entre as opções (ex.: fonte de 700 W).
          el.add(new Option(filter === 'psu' ? `${value} W` : value, value));
        }
        el.value = value;
      } else if (el.type === 'checkbox') {
        if (filter === 'resolution') el.checked = (c.resolutions ?? []).includes(el.value as Resolution);
      } else if (el.type === 'radio') {
        if (filter === 'vram') el.checked = el.value === String(c.minVram ?? 0);
        else if (filter === 'fps') el.checked = el.value === String(c.minFps ?? 0);
        else if (filter === 'category') el.checked = el.value === (c.category ?? '');
      }
    });
  }

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
