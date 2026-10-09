/*
 * Configuração do cliente: tudo o que é desta loja e não do motor (build.js).
 * Para outro cliente, troca-se este arquivo (ou aponta-se CLIENTE=caminho/do/arquivo.js)
 * e o motor continua o mesmo. Textos com <em> são HTML de propósito; o resto é texto puro.
 */
'use strict';

module.exports = {
  // Identidade
  nome: 'Grid Automóveis',
  nomeCurto: 'Grid',
  dominio: 'https://www.gridbh.com',
  logo: { arquivo: 'grid-logo.png', largura: 88, altura: 40 },
  corTema: '#121214',
  fontes: 'https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,700..900&family=IBM+Plex+Mono:wght@400;500&display=swap',

  // Contato (o feed pode trazer outro WhatsApp em dados.loja; estes valem quando não traz)
  whatsappPadrao: '5531996011999',
  telefonePadrao: '31 99601-1999',
  instagram: 'gridbh.auto',
  // Endpoint de captura pública de leads (Integrador / Porta pública)
  leadEndpoint: 'https://script.google.com/macros/s/AKfycbx7DP48bTN9lGJwMQhOCcncLoeAFrP7-IERQWeP-SmYV8VYsFq0BbW1AVY_ZEzvtkprFw/exec',

  // Rastreamento (Pixel da Meta e Google Analytics / Ads)
  // Preencher aqui ou nas variáveis do GitHub Actions / Vercel (PIXEL_ID, GA_ID, GADS_ID).
  pixelId: '',             // Ex: '123456789012345' (Meta Pixel do Gerenciador de Eventos)
  googleAnalyticsId: '',   // Ex: 'G-XXXXXXXXXX' (Google Analytics 4)
  googleAdsId: '',         // Ex: 'AW-XXXXXXXXXX' (Google Ads / Tag de Conversão)

  // Avaliações do Google: sempre os números reais do Perfil da Empresa, atualizados à mão.
  // Sem nota preenchida, aparece só o link "Ver avaliações no Google".
  google: { nota: '', total: '', link: 'https://www.google.com/maps/search/?api=1&query=Grid+Autom%C3%B3veis+Belo+Horizonte' },

  // Mensagens que abrem o WhatsApp
  msgPadrao: 'Olá! Vim pelo site da Grid.',
  msgCarro: (nome, preco) => `Olá! Vi o ${nome} (${preco}) no site da Grid.`,

  // Textos
  textos: {
    tituloInicio: 'Grid Automóveis · Seminovos em Belo Horizonte',
    descricaoInicio: cidade => `Seminovos selecionados em ${cidade}. Fotos de verdade, ficha completa e o preço na tela.`,
    heroHtml: '<span class="pre">Acelera e</span> Vem pra <em>Grid</em>.',
    visiteTitulo: 'A Grid fica no Portal Auto Shopping',
    porqueComprar: 'Por que comprar na Grid',
    vendaTituloHtml: 'Venda ou troque seu carro <em>na Grid</em>.',
    vendaOpcoes: {
      vender: 'A Grid compra o seu carro.',
      trocar: 'Trocar por um carro da Grid',
      consignar: 'A Grid vende o seu carro para você.'
    },
    vendaInteresse: 'Carro da Grid que te interessou'
  },

  // Confiança e procedência (Isaac, 03/10): é o que o cliente procura na loja.
  pilares: [
    ['Procedência', 'Carros com laudo cautelar aprovado.'],
    ['Selecionados', 'Cada carro é escolhido e avaliado antes de entrar no estoque.'],
    ['Preparados', 'Preparamos cada carro antes de ele ir para a vitrine.'],
    ['Facilidade', 'Seu carro na troca, financiamento e transferência pela loja.']
  ]
};
