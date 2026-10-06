# Site da Grid Automóveis — instruções para o Claude

Site www.gridbh.com, feito pela Aires Tecnologia. Este repositório é **público**.

- `build.js` é o motor; `cliente.js` é a configuração da loja (textos, contato, cores). Dado da loja vai
  em `cliente.js`, nunca em `build.js`.
- `dados/estoque.json` é escrito pelo Aires Integrador (feed público). O que o site **recebe** (quais
  carros, campos, preços) é decidido no Integrador; o visual e as páginas, aqui.
- Nunca publicar placa, chassi, custo ou qualquer dado interno da loja. Nenhum segredo no código.
- Mudança grande de visual sai antes numa prévia para o Isaac aprovar; correção pequena vai direto.
- Rodapé: assinatura "Tecnologia Aires" com link para www.airestecnologia.com.br. Não remover.
- O estado e as pendências deste site ficam na memória da conversa da Aires Tecnologia
  (`docs/ESTADO.md` do repositório `aires-vitrine`).
- Commits em português. Explique ao Isaac, em português simples, o que vai fazer antes e o que mudou
  depois.
