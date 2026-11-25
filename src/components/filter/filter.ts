import { applyCriteria, type Criteria } from '../../utils/criteria';
import type { Catalog } from '../../utils/catalog';
import type { Resolution } from '../../utils/games';

/** Catálogo das GPUs embutido na página pelo index.astro. */
const catalog = (window as unknown as { __GPU_CATALOG__?: Catalog }).__GPU_CATALOG__;

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

  /**
   * Lê os controles do painel e monta os critérios.
   * Os controles existem duas vezes (sidebar e gaveta mobile) e ficam sincronizados,
   * então valores repetidos são ignorados.
   */
  function readCriteria(): Criteria {
    const resolutions = new Set<Resolution>();
    let minVram = 0;

    filterInputs.forEach((input) => {
      if (!input.checked) return;
      switch (input.dataset.filter) {
        case 'resolution':
          resolutions.add(input.value as Resolution);
          break;
        case 'vram':
          minVram = parseInt(input.value, 10) || 0;
          break;
      }
    });

    return { resolutions: [...resolutions], minVram };
  }

  function applyFilters() {
    if (!catalog) return;
    const visible = new Set(applyCriteria(catalog, readCriteria()).map((e) => e.gpu.slug));

    cards.forEach((card) => {
      card.classList.toggle('hidden', !visible.has(card.dataset.slug ?? ''));
    });

    const noResults = document.getElementById('no-results');
    if (noResults) {
      noResults.classList.toggle('hidden', visible.size > 0);
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
