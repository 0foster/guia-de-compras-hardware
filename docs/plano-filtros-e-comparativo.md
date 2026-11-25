# Plano: novos filtros (base do assistente) e comparativo de GPUs

Criado em 24/11/2026. Branch de trabalho: `feat/filtros-e-comparativo` (parte de `feat/fps-por-jogo`).

## Objetivo
1. **Filtros novos na home**, desenhados para serem reaproveitados por um futuro **assistente "qual placa comprar?"**.
2. **Comparativo** de até 3 placas lado a lado.

## Ideia central
Separar **"quais placas atendem a estes critérios"** (lógica pura, testável) de **"como isso aparece na página"**.

- Filtros da home → montam um objeto `Criteria` → motor de critérios → placas que atendem, ordenadas.
- Assistente (futuro) → perguntas montam o **mesmo** `Criteria` → mesmo motor → entrega o resultado como link da home com os filtros na URL.
- Comparativo → mesma base de dados (catálogo), com lógica própria de "quem ganha cada linha".

## Decisões tomadas
| Tema | Decisão |
|---|---|
| Placas por comparação | **Até 3** |
| Página do comparativo | Um único modelo `/comparar?gpus=a,b,c` que já vem com as 8 placas; o navegador mostra só as escolhidas e calcula os vencedores. Páginas fixas dos pares mais buscados (para o Google) podem ser geradas depois com o mesmo modelo |
| Diferença em % no comparativo | Sempre em relação à **1ª placa** (a "referência"), que o visitante pode trocar |
| Vencedor de cada linha | Mais FPS, mais VRAM, mais largura de banda, mais CUDA cores e clocks maiores = melhor; menos consumo (TGP) e fonte menor = melhor; valores iguais = ninguém destacado |
| Meta de FPS + tipo de jogo | A placa passa se a **média** de FPS nos jogos daquela categoria atingir a meta |
| Meta de FPS sem jogo/tipo | Vale a média geral dos 24 jogos |
| Resolução usada para o FPS | Se o visitante marcar **uma** resolução, o FPS é medido nela; sem resolução (ou com várias), vale a resolução ideal de cada placa (o comportamento atual do card) |
| Ordem das etapas | Intercalada (abaixo) |

## Filtros (com os dados que já temos)
| Filtro | Situação | Dado usado |
|---|---|---|
| Resolução | já existe | `gpus.json` → `targetResolution` |
| VRAM mínima | já existe | `gpus.json` → `vram` |
| Jogo | novo | `games.json` → FPS do jogo |
| Meta de FPS (60 / 144 / 240) | novo | jogo escolhido, média da categoria ou média geral |
| Tipo de jogo | novo | `games.json` → `category` |
| Sua fonte (W) | novo | `gpus.json` → `recommendedPsu` (requisito oficial NVIDIA) |
| Ordenação | novo | desempenho, eficiência (FPS/W), VRAM, consumo |

Sem preço garantido pela loja, nada de "custo-benefício" até a PA-API destravar.

## Desenhos (resumo)
- **Home:** painel lateral com os filtros (novos marcados), contador "N placas atendem", etiquetas de filtros ativos com "x", seletor de ordenação, card com botão "Comparar" e linha de FPS que muda conforme o filtro (ex.: "Cyberpunk 1440p: 104,2 FPS"), barra fixa no rodapé "Comparar (1 de 3)" com "Comparar agora".
- **Comparativo:** cabeçalho fixo com até 3 colunas (troca/remoção de placa, imagem ilustrativa, "Ver preço"), veredito ("mais rápida", "mais econômica", "mais VRAM"), FPS médio por resolução com % sobre a 1ª placa, especificações agrupadas com "só diferenças" e vencedor em verde, FPS por jogo por categoria com seletor de resolução. No celular, coluna de nomes fixa e placas rolando de lado.

## Peças: o que existe, o que reaproveita, o que é novo
| Peça | Situação |
|---|---|
| `gpus.json`, `games.json`, `affiliate-links.json` | pronto |
| `getGameFpsByCategory`, `formatFps`, `BuyButton`, componentes de SEO | reaproveitar |
| Padrão de dados embutidos como JSON na página (como a busca faz) | reaproveitar o modelo |
| `FilterPanel`, sincronia desktop/mobile, gaveta mobile | estender |
| `filter.ts` | reescrever para só ler os controles e chamar o motor |
| `GpuCard` | estender (botão "Comparar", linha de FPS dinâmica) |
| Seção "Compare" da página da GPU | estender (links para o comparativo) |
| Catálogo unificado (`src/utils/catalog.ts`) | novo |
| Motor de critérios (`src/utils/criteria.ts`) | novo |
| Lógica do comparativo (`src/utils/compare.ts`) | novo |
| Página `/comparar` e componentes | novo |
| Barra de comparação no rodapé | novo |
| Filtros na URL | novo |

## Decisão: filtro "Seu monitor" (substitui "Resolução" e "Meta de FPS")
Toda placa roda em toda resolução; o que importa é a experiência **no monitor do visitante** com **o que ele joga**.

- **Monitor** = resolução + taxa de atualização (60 / 144 / 240 Hz). A resolução deixa de esconder placas "não indicadas".
- **FPS de referência** = média dos **jogos escolhidos** (vários) → senão média do **tipo de jogo** → senão média dos 24 jogos. O card mostra também o jogo mais pesado da seleção.
- **Situação de cada placa** (calculada pelos dados, não por opinião):

| Situação | Regra |
|---|---|
| Não atende | FPS abaixo de **50** (escondida quando há monitor escolhido) |
| Jogável | de 50 FPS até a taxa do monitor |
| Aproveita o monitor | da taxa do monitor até 1,5× ela |
| Sobra desempenho | 1,5× a taxa do monitor ou mais |

- **Recomendada** = a placa mais simples que aproveita o monitor (aproveita ou sobra, com menor FPS). Se nenhuma chega lá, mostra a mais próxima.
- Com monitor escolhido, a ordenação padrão passa a ser "mais adequada ao seu monitor".
- Links antigos continuam funcionando (`jogo=` vira `jogos=`, `fps=` vira `hz=`, várias resoluções → a primeira).

## Etapas
Cada etapa é um commit (e uma prévia quando houver mudança visível).

- [x] **1. Catálogo unificado** — um objeto com specs, FPS médio, FPS por jogo e link de compra de cada GPU, com testes. Nada muda na tela.
- [x] **2. Motor de critérios** — filtrar, ordenar, escolher qual FPS mostrar e explicar por que cada placa passou. Resolução e VRAM migram para ele; visual igual.
- [x] **3. Lógica do comparativo** — para 2 ou 3 placas: vencedor por linha, % sobre a 1ª placa, veredito. Com testes.
- [x] **4. Página `/comparar`** — modelo com as 8 placas, mostra as escolhidas pela URL; cabeçalho fixo com troca/remoção, "só diferenças", resolução selecionável, rolagem lateral no celular. Acessível pela seção "Compare" da página da GPU.
- [x] **5. Filtros novos** — jogo, meta de FPS, tipo de jogo, fonte, ordenação, linha de FPS dinâmica no card.
- [x] **6. Filtros na URL** — etiquetas removíveis, contador, link compartilhável (é por ele que o assistente entregará o resultado).
- [x] **7. Seleção para comparar** — botão "Comparar" nos cards e na página da GPU, barra no rodapé com até 3 placas guardadas no navegador do visitante.
- [x] **8. Pontos de entrada** — link "Comparar" no topo, página `/comparar` vazia com escolha das placas; opcional (não feito): páginas fixas dos pares mais buscados.
- [x] **9. Filtro "Seu monitor"** — classificação por monitor e jogos (decisão acima), vários jogos, etiqueta de situação e "Recomendada" nos cards, URL nova com compatibilidade.
- [ ] **Depois: assistente** — perguntas que montam o `Criteria` da etapa 2 e entregam o link da etapa 6.

## Onde ficou cada parte
| Parte | Arquivos |
|---|---|
| Catálogo | `src/utils/catalog.ts` |
| Motor de critérios | `src/utils/criteria.ts` |
| Filtros ↔ URL e etiquetas | `src/utils/criteria-url.ts` |
| Lógica do comparativo | `src/utils/compare.ts` |
| HTML do comparativo (build e navegador) | `src/utils/compare-render.ts` |
| Página do comparativo | `src/pages/comparar.astro`, `src/components/compare/compare-page.ts` |
| Seleção para comparar | `src/utils/compare-store.ts`, `src/components/compare/CompareTray.astro`, `compare-tray.ts` |
| Filtros da home | `src/components/filter/FilterPanel.astro`, `filter.ts`, `src/pages/index.astro` |

## Como o assistente vai usar isto
1. Perguntas → montam um `Criteria` (ex.: `{ resolution: '1440p', refreshRate: 144, games: ['counter-strike-2', 'cyberpunk-2077'], psuWatts: 650 }`).
2. `applyCriteria(buildCatalog(), criteria)` → placas que servem, já na ordem "mais adequada"; `recommend(...)` → a recomendada (a mais simples que aproveita o monitor, ou a mais próxima); `evaluate(...).reasons` → o "porquê"; `evaluateAll` → também as que não atendem.
3. Resultado completo: `/?` + `criteriaToQuery(criteria)`.

## Referências de UX
- Baymard: comparação usada por 67% dos usuários em produtos técnicos; recomenda "mostrar só diferenças", atributos agrupados, cabeçalho fixo e linhas bem separadas. https://baymard.com/blog/user-friendly-comparison-tools
- Comparadores de GPU: formato "A vs B" com marcador do vencedor por linha e veredito.
- Lojas (KaBuM, Pichau, Amazon): botão "Comparar" no card + barra fixa no rodapé.
