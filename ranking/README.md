# Ranking do autorama — Apps Script separado

Guarda os tempos do joguinho do rodapé do site numa planilha do Isaac. **Não tem nenhuma ligação com o Integrador.**

## Instalar (Antigravity, no notebook do Isaac, com o clasp já logado)

```
cd ranking
clasp create --type sheets --title "Ranking autorama · site Grid" --rootDir .
clasp push -f
clasp deploy --description "ranking v1"
```

- O `clasp create` cria a planilha e o script ligados um ao outro e grava o `.clasp.json` aqui. **Não commitar** o `.clasp.json` (este repositório é público); ele já está no `.gitignore`.
- O `clasp deploy` devolve um ID. O endereço do ranking é `https://script.google.com/macros/s/<ID>/exec`.

## Passo do Isaac (janela de permissão é dele)

1. Abrir o script (`clasp open`) e rodar a função **autorizar** uma vez. O Google pede permissão para a planilha: aceitar.
2. Testar no navegador: `<endereço>?acao=top` deve responder `{"ok":true,"top":[]}`.

## Ligar no site

Pôr o endereço em `cliente.js` → `ranking: { url: '...' }` e publicar. Com o campo vazio, o ranking não aparece.

## Moderar

Abrir a planilha e apagar a linha. Some do ranking em até 1 minuto.
