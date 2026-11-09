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
  facebook: 'https://www.facebook.com/gridbh',
  // Endpoint de captura pública de leads (Integrador / Porta pública)
  leadEndpoint: 'https://script.google.com/macros/s/AKfycbx7DP48bTN9lGJwMQhOCcncLoeAFrP7-IERQWeP-SmYV8VYsFq0BbW1AVY_ZEzvtkprFw/exec',

  // Rastreamento (Pixel da Meta e Google Analytics / Ads)
  // Preencher aqui ou nas variáveis do GitHub Actions / Vercel (PIXEL_ID, GA_ID, GADS_ID).
  pixelId: ['1118877635384992', '1137935252130697'], // Meta Pixels (Grid Automóveis BH + Novo)
  googleAnalyticsId: 'G-L6R6QT828K', // Google Analytics 4 (Grid Automóveis)
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

  // Ranking do autorama (09/11): endereço do Apps Script separado (pasta ranking/). Vazio = ranking escondido.
  ranking: { url: 'https://script.google.com/macros/s/AKfycbyBdABIegVR527E-CehukCZW9g_iQKQnRueMqTe83ZccLPBWn10E_KwdTZ0ML6FIzIA/exec' },

  // Quem somos (Isaac, 09/11): texto institucional, sobre a loja (não sobre os sócios). Foto: arquivo em estatico/.
  quemSomos: {
    titulo: 'Há mais de 10 anos no Portal Auto Shopping',
    foto: 'loja-fachada.jpg',
    fotoAlt: 'A Grid Automóveis no Portal Auto Shopping',
    paragrafos: [
      'A Grid Automóveis é uma loja de seminovos em Belo Horizonte, instalada há mais de dez anos no Portal Auto Shopping, no Carlos Prates.',
      'O nosso trabalho começa antes de o carro chegar à vitrine: cada veículo é escolhido e avaliado, passa por laudo cautelar e é preparado antes de ser anunciado. No site você vê fotos de verdade, a ficha completa e o preço na tela.',
      'Também compramos o seu carro, aceitamos na troca e cuidamos do financiamento e da transferência, com a estrutura e a rede de bancos parceiros do Portal.'
    ]
  },

  // Confiança e procedência (Isaac, 03/10): é o que o cliente procura na loja.
  pilares: [
    ['Procedência', 'Carros com laudo cautelar aprovado.'],
    ['Selecionados', 'Cada carro é escolhido e avaliado antes de entrar no estoque.'],
    ['Preparados', 'Preparamos cada carro antes de ele ir para a vitrine.'],
    ['Facilidade', 'Seu carro na troca, financiamento e transferência pela loja.']
  ]
};
