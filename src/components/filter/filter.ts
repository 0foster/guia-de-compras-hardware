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
  const clearBtns = document.querySelectorAll<HTMLButtonElement>('[data-filter-role="clear-filters"]');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const mobileFilterBtn = document.getElementById('mobile-filter-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileOverlay = document.getElementById('mobile-overlay');
  const mobileClose = document.getElementById('mobile-drawer-close');

  const minHandles = document.querySelectorAll<HTMLInputElement>('[data-filter-role="min-handle"]');
  const maxHandles = document.querySelectorAll<HTMLInputElement>('[data-filter-role="max-handle"]');
  const minInputs = document.querySelectorAll<HTMLInputElement>('[data-filter-role="min-input"]');
  const maxInputs = document.querySelectorAll<HTMLInputElement>('[data-filter-role="max-input"]');
  const rangeFills = document.querySelectorAll<HTMLElement>('[data-filter-role="price-range-fill"]');

  function updateRangeFill() {
    if (!minHandles.length || !maxHandles.length) return;
    const min = parseFloat(minHandles[0].value);
    const max = parseFloat(maxHandles[0].value);
    rangeFills.forEach((fill) => {
      fill.style.left = `${(min / PRICE_MAX_BOUND) * 100}%`;
      fill.style.right = `${100 - (max / PRICE_MAX_BOUND) * 100}%`;
    });
  }

  function syncHandlesToInputs(sourceHandle?: HTMLInputElement) {
    if (!minHandles.length || !maxHandles.length || !minInputs.length || !maxInputs.length) return;
    const min = parseFloat((sourceHandle && sourceHandle.dataset.filterRole === 'min-handle' ? sourceHandle : minHandles[0]).value);
    const max = parseFloat((sourceHandle && sourceHandle.dataset.filterRole === 'max-handle' ? sourceHandle : maxHandles[0]).value);

    minHandles.forEach((h) => {
      if (h !== document.activeElement && h !== sourceHandle) h.value = String(min);
    });
    maxHandles.forEach((h) => {
      if (h !== document.activeElement && h !== sourceHandle) h.value = String(max);
    });

    minInputs.forEach((inp) => {
      if (document.activeElement !== inp) {
        inp.value = min === PRICE_MIN_BOUND ? '' : formatBRL(min);
      }
    });
    maxInputs.forEach((inp) => {
      if (document.activeElement !== inp) {
        inp.value = max === PRICE_MAX_BOUND ? '' : formatBRL(max);
      }
    });
  }

  function syncInputsToHandles(sourceInput?: HTMLInputElement) {
    if (!minHandles.length || !maxHandles.length || !minInputs.length || !maxInputs.length) return;
    const targetMinInp = sourceInput && sourceInput.dataset.filterRole === 'min-input' ? sourceInput : minInputs[0];
    const targetMaxInp = sourceInput && sourceInput.dataset.filterRole === 'max-input' ? sourceInput : maxInputs[0];

    const minParsed = parseBRL(targetMinInp.value);
    const maxParsed = parseBRL(targetMaxInp.value);
    let min = minParsed === null ? PRICE_MIN_BOUND : clamp(minParsed, PRICE_MIN_BOUND, PRICE_MAX_BOUND);
    let max = maxParsed === null ? PRICE_MAX_BOUND : clamp(maxParsed, PRICE_MIN_BOUND, PRICE_MAX_BOUND);
    if (min > max) {
      [min, max] = [max, min];
    }
    minHandles.forEach((h) => (h.value = String(min)));
    maxHandles.forEach((h) => (h.value = String(max)));
    updateRangeFill();
  }

  function syncFilterInput(changedInput: HTMLInputElement) {
    const filterType = changedInput.dataset.filter;
    const value = changedInput.value;
    filterInputs.forEach((input) => {
      if (input !== changedInput && input.dataset.filter === filterType) {
        if (input.type === 'checkbox' && input.value === value) {
          input.checked = changedInput.checked;
        } else if (input.type === 'radio' && input.value === value) {
          input.checked = changedInput.checked;
        }
      }
    });
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
        if (!active[filterType].includes(input.value)) {
          active[filterType].push(input.value);
        }
      }
    });

    const priceMin = minHandles[0] ? parseFloat(minHandles[0].value) : PRICE_MIN_BOUND;
    const priceMax = maxHandles[0] ? parseFloat(maxHandles[0].value) : PRICE_MAX_BOUND;
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
    input.addEventListener('change', (e) => {
      syncFilterInput(e.currentTarget as HTMLInputElement);
      applyFilters();
    });
  });

  // Slider handles
  minHandles.forEach((handle) => {
    handle.addEventListener('input', (e) => {
      if (!minHandles.length || !maxHandles.length) return;
      const target = e.currentTarget as HTMLInputElement;
      const min = parseFloat(target.value);
      const max = parseFloat(maxHandles[0].value);
      if (min > max) {
        target.value = String(max);
      }
      updateRangeFill();
      syncHandlesToInputs(target);
      applyFilters();
    });
  });

  maxHandles.forEach((handle) => {
    handle.addEventListener('input', (e) => {
      if (!minHandles.length || !maxHandles.length) return;
      const target = e.currentTarget as HTMLInputElement;
      const min = parseFloat(minHandles[0].value);
      const max = parseFloat(target.value);
      if (max < min) {
        target.value = String(min);
      }
      updateRangeFill();
      syncHandlesToInputs(target);
      applyFilters();
    });
  });

  // Number inputs (commit on change/blur, not while typing)
  function commitInput(this: HTMLInputElement) {
    syncInputsToHandles(this);
    syncHandlesToInputs();
    applyFilters();
  }
  minInputs.forEach((inp) => {
    inp.addEventListener('change', commitInput);
    inp.addEventListener('blur', commitInput);
  });
  maxInputs.forEach((inp) => {
    inp.addEventListener('change', commitInput);
    inp.addEventListener('blur', commitInput);
  });

  // Allow Enter to commit immediately
  [...minInputs, ...maxInputs].forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        (e.currentTarget as HTMLInputElement).blur();
      }
    });
  });

  clearBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterInputs.forEach((input) => {
        if (input.type === 'radio') {
          input.checked = input.value === '0';
        } else {
          input.checked = false;
        }
      });
      minHandles.forEach((h) => (h.value = String(PRICE_MIN_BOUND)));
      maxHandles.forEach((h) => (h.value = String(PRICE_MAX_BOUND)));
      minInputs.forEach((inp) => (inp.value = ''));
      maxInputs.forEach((inp) => (inp.value = ''));
      updateRangeFill();
      applyFilters();
    });
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
