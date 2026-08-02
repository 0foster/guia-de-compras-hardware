# Guia de Compras Hardware 🖥️

O **Guia de Compras Hardware** é um site estático focado em ajudar consumidores a comparar as placas de vídeo NVIDIA da série RTX 50. O projeto exibe especificações, benchmarks de FPS e links afiliados para facilitar a melhor decisão de compra.

O site está disponível ou será implantado no domínio: `guiadecomprashardware.com.br`.

## Por que este projeto existe? 🤔

Escolher a placa de vídeo ideal pode ser um processo confuso, envolvendo centenas de especificações técnicas (VRAM, TGP, largura de banda) e a necessidade de procurar benchmarks espalhados por diversos sites. Este projeto consolida dados precisos da nova série NVIDIA RTX 50 (da 5050 à 5090) com filtros fáceis de usar (resolução, preço, VRAM), otimização SEO e uma experiência de usuário focada em performance. 

## Tech Stack 🛠️

O projeto foi construído utilizando as ferramentas mais modernas do ecossistema front-end:

| Tecnologia | Versão | Descrição |
| :--- | :--- | :--- |
| **Astro** | 6.1.0 | Framework estático ultra-rápido |
| **Tailwind CSS** | v4 | Framework de CSS utilitário para estilização |
| **TypeScript** | - | Tipagem estática para JavaScript |

## Pré-requisitos ⚙️

- **Node.js**: `>= 22.12.0` (Obrigatório)
- **NPM**: Gerenciador de pacotes (geralmente incluído com o Node.js)

## Getting Started 🚀

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/guia-de-compras.git
   ```
2. Entre na pasta do projeto:
   ```bash
   cd guia-de-compras
   ```
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Abra o navegador em `http://localhost:4321`.

## Comandos Disponíveis 📦

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento no `localhost:4321` |
| `npm run build` | Gera o build de produção (arquivos estáticos) na pasta `./dist/` |
| `npm run preview` | Inicia um servidor local para visualizar o build de produção |
| `npm run check` | Executa a verificação de tipagem do Astro (TypeScript) |
| `npm test` | Executa o `npm run check` e em seguida roda a suíte de testes do Vitest |
| `npm run test:watch`| Executa o Vitest em modo watch (ótimo para desenvolvimento) |

## Arquitetura do Projeto 🏗️

A estrutura de pastas do projeto está organizada da seguinte maneira:

```
src/
├── components/
│   ├── filter/      → Componentes de filtro (FilterPanel.astro, filter.ts)
│   ├── gpu/         → Componentes de interface das placas (GpuCard, GpuSpecTable, FpsBenchmark, BuyButton, AdjacentGpus)
│   ├── layout/      → Componentes estruturais (BaseLayout, Header, Footer)
│   ├── search/      → Sistema de busca (SearchDropdown.astro, search.ts)
│   └── seo/         → Componentes de SEO e Schemas JSON-LD
├── data/
│   ├── gpus.json              → Banco de dados principal das placas
│   └── affiliate-links.json   → Links de parceiros para as lojas
├── pages/
│   ├── index.astro            → Página inicial
│   ├── sobre.astro            → Página "Sobre nós"
│   └── gpus/[slug].astro      → Páginas dinâmicas para cada GPU
├── styles/
│   └── global.css             → Folha de estilos global
└── utils/
    ├── format.ts              → Utilitários de formatação (moeda, números)
    └── gpu.ts                 → Lógicas de busca e filtragem de GPUs
```

## Sistema de Dados 💾

O site é fortemente guiado a dados (*data-driven*), baseando-se em dois arquivos JSON principais:
- `src/data/gpus.json`: Define as propriedades, especificações e benchmarks de todas as 7 GPUs catalogadas (RTX 5050 até RTX 5090). A criação de páginas dinâmicas e as tabelas comparativas consomem este arquivo diretamente.
- `src/data/affiliate-links.json`: Contém os dados de precificação e links de parceiros (afiliados) que alimentam os botões de compra (BuyButton).

## Status Atual 📊

**O que já está pronto:**
- ✅ Catálogo de 7 GPUs da série RTX 50 (5050 a 5090) com especificações reais
- ✅ Filtros client-side rápidos (resolução, VRAM, preço)
- ✅ Suporte completo a Dark Mode
- ✅ SEO Avançado (Sitemap, tags Meta, JSON-LD Schemas)
- ✅ Arquitetura base implementada (Astro + Tailwind)

**Em andamento / Placeholders:**
- 🚧 Links de afiliados (atualmente utilizando dados simulados)
- 🚧 Imagens das placas de vídeo (atualmente utilizando SVG placeholders)
- 🚧 Componente de busca por texto (em desenvolvimento)

## Roadmap 🗺️

1. **Integração de APIs de Lojas**: Implementar Amazon PA-API e API do Mercado Livre para puxar preços dinamicamente.
2. **Imagens Reais**: Substituir os SVG placeholders pelas imagens de caixas e produtos via marketplace API ou assets de alta definição.
3. **Deploy de Produção**: Automatizar a pipeline de CI/CD e implantar o projeto no domínio oficial (Vercel ou Cloudflare Pages recomendado).

## Licença 📜

Este projeto está sob a licença **MIT**. Sinta-se livre para utilizar, modificar e distribuir o código de acordo com os termos da licença.
