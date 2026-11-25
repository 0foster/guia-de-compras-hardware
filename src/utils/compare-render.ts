/**
 * Monta o HTML da página de comparação a partir da lógica de `compare.ts`.
 *
 * A mesma função roda no build (a página já sai com uma comparação pronta, boa
 * para o Google) e no navegador (quando o visitante troca, adiciona ou remove
 * placas). As ações usam atributos `data-action`, tratados por compare-page.ts.
 */
import type { Catalog, CatalogGpu } from './catalog';
import { RESOLUTIONS, type Resolution } from './games';
import {
  compareAverageFps,
  compareGames,
  compareSpecs,
  verdict,
  verdictSentences,
  MAX_COMPARE,
  MIN_COMPARE,
  type CompareGroup,
  type CompareRow,
} from './compare';

export interface CompareState {
  slugs: string[];
  res: Resolution;
  onlyDiff: boolean;
}

const SPECS_SOURCE_URL = 'https://www.nvidia.com/en-us/geforce/graphics-cards/compare/';
const FPS_SOURCE_URLS = [
  'https://www.techpowerup.com/review/gigabyte-geforce-rtx-5050-gaming-oc/',
  'https://www.techpowerup.com/review/pny-geforce-rtx-5070-ti-epic-x-rgb-plus-oc/',
];

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Coluna fixa à esquerda (nomes das linhas), com fundo para cobrir a rolagem lateral. */
const STICKY_COL = 'sticky left-0 z-10 bg-white dark:bg-gray-950';

function gridStyle(columns: number): string {
  return `grid-template-columns: minmax(7rem, 1.2fr) repeat(${columns}, minmax(7.5rem, 1fr));`;
}

function formatDiff(diff: number | undefined): string {
  if (diff === undefined) return '';
  const sign = diff > 0 ? '+' : '';
  return ` <span class="text-xs font-normal text-gray-400 dark:text-gray-500">${sign}${diff}%</span>`;
}

function renderRow(row: CompareRow, columns: number, extraCol: boolean, onlyDiff: boolean): string {
  if (onlyDiff && row.allEqual) return '';
  const cells = row.cells
    .map((cell) => {
      const best = cell.isBest ? 'font-bold text-green-600 dark:text-green-500' : 'text-gray-900 dark:text-gray-100';
      const mark = cell.isBest ? '<span class="sr-only"> (melhor)</span>' : '';
      return `<div class="px-3 py-2 text-sm tabular-nums ${best}" data-gpu="${esc(cell.slug)}">${esc(cell.text)}${formatDiff(cell.diffPct)}${mark}</div>`;
    })
    .join('');
  return `<div class="grid border-t border-gray-100 dark:border-gray-800" style="${gridStyle(columns)}" data-row="${esc(row.key)}">
    <div class="${STICKY_COL} px-3 py-2 text-sm text-gray-600 dark:text-gray-400">${esc(row.label)}</div>
    ${cells}${extraCol ? '<div></div>' : ''}
  </div>`;
}

function renderGroups(groups: CompareGroup[], columns: number, extraCol: boolean, onlyDiff: boolean): string {
  return groups
    .map((group) => {
      const rows = group.rows.map((r) => renderRow(r, columns, extraCol, onlyDiff)).join('');
      const hidden = onlyDiff ? group.rows.filter((r) => r.allEqual).length : 0;
      if (!rows) {
        return `<div class="border-t border-gray-100 px-3 py-2 text-xs text-gray-400 dark:border-gray-800">${esc(group.label)}: tudo igual (${hidden} ${hidden === 1 ? 'item' : 'itens'})</div>`;
      }
      return `<div class="border-t border-gray-100 bg-gray-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400" data-group="${esc(group.key)}">${esc(group.label)}</div>${rows}${
        hidden ? `<div class="border-t border-gray-100 px-3 py-1.5 text-xs text-gray-400 dark:border-gray-800">${hidden} ${hidden === 1 ? 'item igual escondido' : 'itens iguais escondidos'}</div>` : ''
      }`;
    })
    .join('');
}

function gpuOptions(catalog: Catalog, selectedSlug: string | null, taken: string[]): string {
  return catalog.gpus
    .map((g) => {
      const selected = g.slug === selectedSlug ? ' selected' : '';
      const disabled = g.slug !== selectedSlug && taken.includes(g.slug) ? ' disabled' : '';
      return `<option value="${esc(g.slug)}"${selected}${disabled}>${esc(g.shortName)}</option>`;
    })
    .join('');
}

const SELECT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm font-semibold text-gray-900 focus:border-[var(--color-brand-red)] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

function renderBuy(gpu: CatalogGpu): string {
  const amazon = gpu.buyLinks.amazon;
  if (amazon) {
    return `<a href="${esc(amazon.url)}" target="_blank" rel="noopener nofollow sponsored" class="block rounded-lg border-2 border-[#FF9900] px-2 py-1.5 text-center text-xs font-bold text-[#FF9900] hover:bg-[#FF9900]/10">Amazon · Ver preço</a>`;
  }
  return '<p class="rounded-lg border border-dashed border-gray-300 px-2 py-1.5 text-center text-xs text-gray-400 dark:border-gray-700">Links em breve</p>';
}

function renderHeader(gpus: CatalogGpu[], catalog: Catalog, columns: number, extraCol: boolean): string {
  const taken = gpus.map((g) => g.slug);
  const cols = gpus
    .map((gpu, i) => {
      const controls =
        i === 0
          ? '<span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-gray-400">Referência</span>'
          : `<button type="button" data-action="ref" data-index="${i}" class="text-[11px] text-gray-500 underline hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">Usar como referência</button>`;
      const remove =
        gpus.length > MIN_COMPARE
          ? `<button type="button" data-action="remove" data-index="${i}" aria-label="Remover ${esc(gpu.shortName)}" class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800">✕</button>`
          : '';
      return `<div class="flex flex-col gap-2 px-3 py-3" data-gpu="${esc(gpu.slug)}">
        <div class="flex items-center gap-1">
          <label class="sr-only" for="compare-swap-${i}">Placa ${i + 1}</label>
          <select id="compare-swap-${i}" data-action="swap" data-index="${i}" class="${SELECT_CLASS}">${gpuOptions(catalog, gpu.slug, taken)}</select>
          ${remove}
        </div>
        <div class="flex h-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800" aria-hidden="true">
          <svg class="h-7 w-7 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
        </div>
        <div class="flex items-center justify-between gap-1">${controls}<a href="/gpus/${esc(gpu.slug)}" class="text-[11px] text-gray-500 underline hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">Ficha</a></div>
        ${renderBuy(gpu)}
      </div>`;
    })
    .join('');

  const add = extraCol
    ? `<div class="flex flex-col gap-2 px-3 py-3">
        <label class="sr-only" for="compare-add">Adicionar placa</label>
        <select id="compare-add" data-action="add" class="${SELECT_CLASS} border-dashed font-normal text-gray-500">
          <option value="" selected>+ adicionar placa</option>${gpuOptions(catalog, null, taken)}
        </select>
        <p class="text-[11px] text-gray-400">Compare até ${MAX_COMPARE} placas</p>
      </div>`
    : '';

  return `<div class="compare-head grid border-b border-gray-200 bg-white lg:sticky lg:top-16 lg:z-20 dark:border-gray-800 dark:bg-gray-950" style="${gridStyle(columns)}">
    <div class="${STICKY_COL} flex items-end px-3 py-3 text-[11px] leading-snug text-gray-400">Diferenças em % são em relação à placa de referência</div>
    ${cols}${add}
  </div>`;
}

function renderControls(state: CompareState): string {
  const tabs = RESOLUTIONS.map(
    (res) =>
      `<button type="button" data-action="res" data-res="${res}" aria-pressed="${res === state.res}" class="flex-1 rounded-md px-4 py-1.5 text-sm font-medium text-gray-500 aria-pressed:bg-white aria-pressed:text-gray-900 aria-pressed:shadow-sm dark:text-gray-400 dark:aria-pressed:bg-gray-700 dark:aria-pressed:text-gray-100">${res}</button>`,
  ).join('');
  return `<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div class="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800" role="group" aria-label="Resolução dos jogos">${tabs}</div>
    <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
      <input type="checkbox" data-action="diff" ${state.onlyDiff ? 'checked' : ''} class="h-4 w-4 rounded border-gray-300 accent-[var(--color-brand-red)]" />
      Mostrar só diferenças
    </label>
  </div>`;
}

const section = (title: string, body: string, note = '') =>
  `<section class="mb-8"><h2 class="mb-3 text-xl font-bold text-gray-900 dark:text-gray-100">${title}</h2>${body}${note}</section>`;

const table = (inner: string) =>
  `<div class="overflow-clip rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">${inner}</div>`;

export function renderCompare(state: CompareState, catalog: Catalog): string {
  const gpus = state.slugs
    .map((slug) => catalog.gpus.find((g) => g.slug === slug))
    .filter((g): g is CatalogGpu => Boolean(g));
  const extraCol = gpus.length < MAX_COMPARE;
  const columns = gpus.length + (extraCol ? 1 : 0);

  const verdictHtml = `<ul class="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">${verdictSentences(
    verdict(gpus, state.res),
  )
    .map((s) => `<li>${esc(s)}</li>`)
    .join('')}</ul>`;

  const avgRows = compareAverageFps(gpus)
    .map((r) => renderRow(r, columns, extraCol, false))
    .join('');

  const specs = renderGroups(compareSpecs(gpus), columns, extraCol, state.onlyDiff);
  const games = renderGroups(compareGames(gpus, catalog, state.res), columns, extraCol, state.onlyDiff);

  const fpsNote = `<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Qualidade máxima, resolução nativa, sem ray tracing e sem DLSS/FSR. Fonte: TechPowerUp (${FPS_SOURCE_URLS.map(
    (u, i) => `<a class="underline" href="${u}" target="_blank" rel="noopener">review ${i + 1}</a>`,
  ).join(', ')}), mesma máquina de teste.</p>`;
  const specsNote = `<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Especificações oficiais de referência. Fonte: <a class="underline" href="${SPECS_SOURCE_URL}" target="_blank" rel="noopener">NVIDIA</a>. Em verde, o melhor valor de cada linha.</p>`;

  return `${renderControls(state)}
  ${section('Veredito', verdictHtml)}
  <p class="mb-2 text-xs text-gray-400 lg:hidden">Arraste a tabela para o lado para ver todas as placas.</p>
  <div class="overflow-x-auto lg:overflow-visible">
    <div class="min-w-[36rem]">
      ${renderHeader(gpus, catalog, columns, extraCol)}
      <div class="mt-6">
        ${section('FPS médio (24 jogos)', table(avgRows), fpsNote)}
        ${section('Especificações', table(specs), specsNote)}
        ${section(`FPS por jogo · ${state.res}`, table(games), fpsNote)}
      </div>
    </div>
  </div>`;
}
