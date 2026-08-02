# Integração com APIs de marketplaces — estudo

Documento de viabilidade para automatizar a obtenção de **imagens, preços e disponibilidade** dos produtos listados, eliminando a manutenção manual de [src/data/affiliate-links.json](../src/data/affiliate-links.json).

Atualizado em: **2026-05-10**

---

## Estado atual
- Catálogo (`gpus.json`) e links de afiliado (`affiliate-links.json`) são editados à mão.
- URLs em `affiliate-links.json` são placeholders (`PLACEHOLDER` na URL, `SEU-TAG-20`/`SEU-ID` no parâmetro de afiliado).
- Imagens das GPUs são SVGs placeholder em [GpuCard.astro:42-46](../src/components/gpu/GpuCard.astro) e [\[slug\].astro](../src/pages/gpus/%5Bslug%5D.astro).

## Objetivo
Substituir esses placeholders por dados reais e atualizá-los **automaticamente** sem perder a simplicidade do site estático Astro.

---

## Opção 1 — Amazon Product Advertising API (PA-API 5.0)

### Requisitos
1. Conta AWS ativa.
2. Cadastro no **Amazon Associates Brasil** (`https://associados.amazon.com.br`).
3. **Bloqueio inicial**: a Amazon só libera as credenciais PA-API após o programa registrar **3 vendas qualificadas em até 180 dias** desde a inscrição. Isso é o ponto mais crítico — sem vendas, o site não tem como puxar dados via API. Workaround: usar links manuais com tag de afiliado nos primeiros meses para gerar as 3 vendas, depois ativar a API.
4. Após aprovação: gerar `Access Key`, `Secret Key` e `Partner Tag` no painel de Associates.

### Endpoints relevantes
- **`GetItems`** — recebe lista de ASINs (`B0XXXXXXXX`), retorna preço, imagens (multiple sizes), disponibilidade, título, ofertas.
- **`SearchItems`** — busca por keywords, útil para descoberta inicial de ASINs novos.
- **`GetVariations`** — variações de produto (cor, tamanho).

### Saída útil
```jsonc
{
  "ItemInfo": { "Title": { "DisplayValue": "..." } },
  "Images": {
    "Primary": { "Large": { "URL": "https://m.media-amazon.com/..." } }
  },
  "Offers": {
    "Listings": [{
      "Price": { "Amount": 7990.00, "Currency": "BRL" },
      "Availability": { "Message": "Em estoque" }
    }]
  }
}
```

### Limitações
- **Rate limit inicial**: 1 req/s e 8.640 reqs/dia. Escala automaticamente com volume de vendas.
- **TPS-throttling**: bursts de requisições são bloqueados — precisa de fila/delay.
- **TOS**: caching limitado a **24h** para preços e disponibilidade. Imagens podem ser cacheadas indefinidamente.
- **Disponibilidade do produto na Amazon Brasil é volátil**: GPUs caras frequentemente saem do estoque, e o ASIN pode mudar entre lotes.

### Bibliotecas
- Oficial: nenhuma para Node mantida pela Amazon.
- Comunidade (mais usadas): `paapi5-nodejs-sdk` (mantido pela própria Amazon, mas em GitHub `aws/paapi5-nodejs-sdk`), `amazon-paapi`.

---

## Opção 2 — Mercado Livre Developers API

### Requisitos
1. Conta normal no Mercado Livre.
2. Criar app em `https://developers.mercadolivre.com.br/`.
3. OAuth 2.0 (Authorization Code Flow) — gera `access_token` (válido 6h) + `refresh_token` (válido 6 meses).
4. Programa de afiliados (`https://www.mercadolivre.com.br/afiliados`) é separado da API: as URLs precisam ser geradas pelo painel de afiliados ou via parâmetro `?matt_word=<id>`.

### Endpoints relevantes
- **`GET /items/MLB{id}`** — retorna `title`, `pictures[]`, `price`, `available_quantity`, `condition`, `permalink`.
- **`GET /sites/MLB/search?q=...`** — busca por keywords.
- **`GET /items/MLB{id}/description`** — descrição rica (não essencial).

### Vantagens vs Amazon
- **Não exige vendas prévias** para liberar a API — funciona desde o cadastro.
- Rate limits mais permissivos (não publicado oficialmente, mas tipicamente 1.000+ req/min por app).
- Sem restrição de cache no TOS.
- Disponibilidade de GPUs no Mercado Livre é geralmente maior que na Amazon Brasil para hardware.

### Saída útil
```jsonc
{
  "title": "Placa de Vídeo RTX 5070 Ti 16GB ASUS ROG",
  "price": 7990.0,
  "currency_id": "BRL",
  "available_quantity": 12,
  "pictures": [{ "url": "https://http2.mlstatic.com/D_NQ_NP_..." }],
  "permalink": "https://produto.mercadolivre.com.br/MLB-..."
}
```

---

## Opção 3 — Scraping (descartar)
- Viola TOS de ambos os marketplaces.
- DOM muda sem aviso — manutenção alta.
- Risco de bloqueio de IP / bloqueio de afiliado.
- **Não recomendado.**

---

## Estratégia de integração com Astro estático

### Recomendação: **build-time fetch** (Opção A do plano)

Script `scripts/fetch-prices.mjs` que:
1. Lê [src/data/gpus.json](../src/data/gpus.json) para descobrir os slugs.
2. Lê um mapa `slugs-to-marketplace-ids.json` (novo arquivo, mantido manualmente) que associa cada slug a um ASIN Amazon e/ou ID Mercado Livre:
   ```jsonc
   {
     "rtx-5070-ti": { "amazonAsin": "B0XXXXXXXX", "mlId": "MLB1234567890" }
   }
   ```
3. Para cada slug, faz fetch nas duas APIs (com delay/retries respeitando rate limits).
4. Regrava `src/data/affiliate-links.json` com preços, imagens e disponibilidade frescos.
5. (Opcional) Baixa as imagens primárias para `public/images/gpus/<slug>.jpg` para servir localmente — mais rápido e evita dependência de URLs da Amazon que podem expirar.
6. Commita as mudanças.

**Trigger**: GitHub Action diária (`schedule: "0 6 * * *"`) que roda o script, faz o build, e reimplanta. Custo zero em runner público.

**Vantagens**
- Site permanece 100% estático — zero JS no client, SEO perfeito, hospedagem grátis (Cloudflare Pages, Vercel free, Netlify free).
- Rate limits respeitados naturalmente (1 batch/dia).
- Histórico de preços fica no Git (cada commit = snapshot).

**Desvantagens**
- Latência de até 24h no preço — aceitável para hardware (preços mudam mais lentamente que produtos voláteis tipo eletrônicos pequenos).

### Alternativa: Astro endpoint serverless (Opção B do plano)

`src/pages/api/price/[slug].ts` que faz fetch no client com cache de 1h. Descartar por enquanto:
- Exige host serverless (perde Cloudflare Pages / Netlify estático puro).
- Cache de 1h pode estourar rate limit da Amazon em picos.
- Adiciona JS no client — perde performance e SEO.

---

## Próximos passos (fora do escopo desta fase)

Quando o usuário decidir avançar com a implementação:

1. **Aplicar para Amazon Associates Brasil** — começar o relógio das 3 vendas iniciais. Estimativa: 2-4 meses até liberar PA-API se o tráfego for orgânico.
2. **Cadastrar app no Mercado Livre Developers** — pode ser feito imediatamente.
3. **Criar `slugs-to-marketplace-ids.json`** — mapear ASINs e IDs ML para as 7 GPUs cadastradas.
4. **Implementar `scripts/fetch-prices.mjs`** — Node 22 (já requerido em [package.json:6](../package.json#L6)) com `fetch` nativo + `paapi5-nodejs-sdk`.
5. **Criar GitHub Action** com secrets `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY`, `AMAZON_PARTNER_TAG`, `ML_CLIENT_ID`, `ML_CLIENT_SECRET`, `ML_REFRESH_TOKEN`.
6. **Adicionar lógica de fallback** no script: se PA-API falhar, manter o último preço conhecido em vez de zerar.

**Esforço estimado de implementação**: 1-2 dias de dev para o script + Action, mais o tempo de espera burocrática (Amazon Associates).

---

## Decisão pendente
- Qual estratégia o usuário prefere: **A (build-time, recomendada)** ou **B (serverless)**?
- Ordem dos marketplaces: começar só com Mercado Livre (mais rápido, sem bloqueio inicial) e adicionar Amazon depois das 3 vendas, ou esperar e fazer ambos juntos?

> Sugestão: começar **só com Mercado Livre** assim que houver budget de dev, porque a Amazon vai estar bloqueada até gerar as 3 vendas — paralelizar reduz o tempo total para o site ser 100% automático.
