# grid-site

Site da Grid Automóveis em **www.gridbh.com**, publicado pelo GitHub Pages.

- A especificação fica no repositório do Integrador: `docs/site.md` (e `docs/site-ideias.md`, `docs/feed-site.md`).
- `site/` é o que vai ao ar. O fluxo `.github/workflows/pages.yml` publica a cada push na `main`.
- Fase 1 (próximo passo): `dados/estoque.json`, gravado pelo Integrador, e um `build.js` que gera uma página por carro em `site/`.
- Hoje está no ar só uma página provisória ("site novo chegando"), com `noindex`.
- Repositório público: aqui só entra o que já é público (carros à venda). Nada de custo, cliente, placa ou dado interno.
