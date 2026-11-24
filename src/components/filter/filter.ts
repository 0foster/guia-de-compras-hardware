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

  clearBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterInputs.forEach((input) => {
        if (input.type === 'radio') {
          input.checked = input.value === '0';
        } else {
          input.checked = false;
        }
      });
      applyFilters();
    });
  });

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
