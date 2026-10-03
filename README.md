# grid-site

Site da Grid Automóveis em **www.gridbh.com**, publicado pelo GitHub Pages.

## Como funciona

1. O Integrador (repositório privado) grava `dados/estoque.json` e `dados/meta.csv` aqui, só quando o estoque muda.
2. Cada mudança na `main` dispara o fluxo `.github/workflows/pages.yml`, que roda `node build.js` e publica a pasta `_site/`.
3. `build.js` gera a vitrine, uma página por carro (`/carro/<slug>/`, com a prévia do link no WhatsApp), a página "vendido" para todo carro que já saiu (lida do histórico do git, então o link nunca quebra), `/loja/`, `/privacidade/`, `404.html`, `sitemap.xml` e `robots.txt`.

## Pastas

- `dados/` — estoque publicado pelo Integrador. Também fica em `www.gridbh.com/dados/` (a Meta lê o `meta.csv` daí).
- `estilo/` — `site.css` e `site.js` (vão para `/assets/`).
- `estatico/` — copiado como está (logo, protótipos).

## Testar no computador

```
node build.js
npx serve _site     # ou qualquer servidor estático
```

## Pixel da Meta

Fica desligado enquanto a variável `PIXEL_ID` não existir. Para ligar: Settings → Secrets and variables → Actions → aba **Variables** → `PIXEL_ID` com o número do pixel. O site passa a mostrar o aviso de cookies.

## Regras

- Repositório público: aqui só entra o que já é público (carros à venda). Nada de custo, cliente, placa, chassi ou dado interno.
- Especificação: no Integrador, `docs/site.md`, `docs/site-ideias.md` e `docs/feed-site.md`.
