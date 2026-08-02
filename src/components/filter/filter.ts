const PRICE_MIN_BOUND = 0;
const PRICE_MAX_BOUND = 200000;

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseBRL(raw: string): number | null {
  const cleaned = raw.replace(/\s|R\$/g, '').trim();
  if (!cleaned) return null;
  // pt-BR: thousand separator ".", decimal ","
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function initFilters() {
  const cards = document.querySelectorAll<HTMLElement>('.gpu-card');
  const filterInputs = document.querySelectorAll<HTMLInputElement>('[data-filter]');
  const clearBtn = document.getElementById('clear-filters');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const mobileFilterBtn = document.getElementById('mobile-filter-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileOverlay = document.getElementById('mobile-overlay');
  const mobileClose = document.getElementById('mobile-drawer-close');

  const minHandle = document.getElementById('price-min-handle') as HTMLInputElement | null;
  const maxHandle = document.getElementById('price-max-handle') as HTMLInputElement | null;
  const minInput = document.getElementById('price-min-input') as HTMLInputElement | null;
  const maxInput = document.getElementById('price-max-input') as HTMLInputElement | null;
  const rangeFill = document.getElementById('price-range-fill') as HTMLElement | null;

  function updateRangeFill() {
    if (!minHandle || !maxHandle || !rangeFill) return;
    const min = parseFloat(minHandle.value);
    const max = parseFloat(maxHandle.value);
    rangeFill.style.left = `${(min / PRICE_MAX_BOUND) * 100}%`;
    rangeFill.style.right = `${100 - (max / PRICE_MAX_BOUND) * 100}%`;
  }

  function syncHandlesToInputs() {
    if (!minHandle || !maxHandle || !minInput || !maxInput) return;
    const min = parseFloat(minHandle.value);
    const max = parseFloat(maxHandle.value);
    if (document.activeElement !== minInput) {
      minInput.value = min === PRICE_MIN_BOUND ? '' : formatBRL(min);
    }
    if (document.activeElement !== maxInput) {
      maxInput.value = max === PRICE_MAX_BOUND ? '' : formatBRL(max);
    }
  }

  function syncInputsToHandles() {
    if (!minHandle || !maxHandle || !minInput || !maxInput) return;
    const minParsed = parseBRL(minInput.value);
    const maxParsed = parseBRL(maxInput.value);
    let min = minParsed === null ? PRICE_MIN_BOUND : clamp(minParsed, PRICE_MIN_BOUND, PRICE_MAX_BOUND);
    let max = maxParsed === null ? PRICE_MAX_BOUND : clamp(maxParsed, PRICE_MIN_BOUND, PRICE_MAX_BOUND);
    if (min > max) {
      [min, max] = [max, min];
    }
    minHandle.value = String(min);
    maxHandle.value = String(max);
    updateRangeFill();
  }

  function applyFilters() {
    const active: Record<string, string[]> = {};

    filterInputs.forEach((input) => {
      const filterType = input.dataset.filter!;
      if (input.type === 'radio') {
        if (input.checked && input.value !== '0') {
          active[filterType] = [input.value];
        }
      } else if (input.checked) {
        if (!active[filterType]) active[filterType] = [];
        active[filterType].push(input.value);
      }
    });

    const priceMin = minHandle ? parseFloat(minHandle.value) : PRICE_MIN_BOUND;
    const priceMax = maxHandle ? parseFloat(maxHandle.value) : PRICE_MAX_BOUND;
    const priceFilterActive = priceMin > PRICE_MIN_BOUND || priceMax < PRICE_MAX_BOUND;

    cards.forEach((card) => {
      let visible = true;

      // Resolution filter (OR within)
      if (active.resolution?.length) {
        const cardRes = (card.dataset.resolution || '').split(',');
        visible = active.resolution.some((r) => cardRes.includes(r));
      }

      // VRAM filter (minimum)
      if (visible && active.vram?.length) {
        const minVram = parseInt(active.vram[0], 10);
        const cardVram = parseInt(card.dataset.vram || '0', 10);
        visible = cardVram >= minVram;
      }

      // Price filter (only when active)
      if (visible && priceFilterActive) {
        const rawPrice = card.dataset.priceMin;
        if (!rawPrice) {
          visible = false;
        } else {
          const cardPrice = parseFloat(rawPrice);
          visible = cardPrice >= priceMin && cardPrice <= priceMax;
        }
      }

      card.classList.toggle('hidden', !visible);
    });

    const visibleCards = document.querySelectorAll('.gpu-card:not(.hidden)');
    const noResults = document.getElementById('no-results');
    if (noResults) {
      noResults.classList.toggle('hidden', visibleCards.length > 0);
    }
  }

  filterInputs.forEach((input) => {
    input.addEventListener('change', applyFilters);
  });

  // Slider handles
  minHandle?.addEventListener('input', () => {
    if (!minHandle || !maxHandle) return;
    const min = parseFloat(minHandle.value);
    const max = parseFloat(maxHandle.value);
    if (min > max) {
      minHandle.value = String(max);
    }
    updateRangeFill();
    syncHandlesToInputs();
    applyFilters();
  });

  maxHandle?.addEventListener('input', () => {
    if (!minHandle || !maxHandle) return;
    const min = parseFloat(minHandle.value);
    const max = parseFloat(maxHandle.value);
    if (max < min) {
      maxHandle.value = String(min);
    }
    updateRangeFill();
    syncHandlesToInputs();
    applyFilters();
  });

  // Number inputs (commit on change/blur, not while typing)
  function commitInput(this: HTMLInputElement) {
    syncInputsToHandles();
    syncHandlesToInputs();
    applyFilters();
  }
  minInput?.addEventListener('change', commitInput);
  maxInput?.addEventListener('change', commitInput);
  minInput?.addEventListener('blur', commitInput);
  maxInput?.addEventListener('blur', commitInput);

  // Allow Enter to commit immediately
  [minInput, maxInput].forEach((el) => {
    el?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        (e.currentTarget as HTMLInputElement).blur();
      }
    });
  });

  clearBtn?.addEventListener('click', () => {
    filterInputs.forEach((input) => {
      if (input.type === 'radio') {
        input.checked = input.value === '0';
      } else {
        input.checked = false;
      }
    });
    if (minHandle) minHandle.value = String(PRICE_MIN_BOUND);
    if (maxHandle) maxHandle.value = String(PRICE_MAX_BOUND);
    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';
    updateRangeFill();
    applyFilters();
  });

  // Initial render
  updateRangeFill();

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
