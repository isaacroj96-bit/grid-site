#!/usr/bin/env node
/*
 * Motor do site: monta as páginas a partir de dados/estoque.json (publicado pelo Integrador).
 * Tudo o que é do cliente (nome, contato, textos, logo) fica em cliente.js.
 * Sem dependências: só Node. Saída em _site/ (o GitHub Actions publica essa pasta).
 *
 *   node build.js
 *
 * Gera: vitrine (/), uma página por carro (/carro/<slug>/), página "vendido" para carros que já
 * saíram (o link nunca quebra), /loja/, /privacidade/, 404.html, sitemap.xml e robots.txt.
 * Especificação: repositório do Integrador, docs/site.md.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// ---------- configuração ----------
// Cliente: cliente.js na raiz, ou outro arquivo com CLIENTE=caminho node build.js.
const C = require(path.resolve(__dirname, process.env.CLIENTE || 'cliente.js'));
const CONFIG = {
  dominio: C.dominio,
  // Rastreamento: ID do pixel da Meta e Google Analytics / Ads.
  pixelId: process.env.PIXEL_ID || C.pixelId || '',
  googleAnalyticsId: process.env.GA_ID || C.googleAnalyticsId || '',
  googleAdsId: process.env.GADS_ID || C.googleAdsId || '',
  leadEndpoint: process.env.LEAD_ENDPOINT || C.leadEndpoint || '',
  whatsappPadrao: C.whatsappPadrao,
  instagram: C.instagram,
  google: C.google,
  // Prévia: BASE=/prototipo/v3 SAIDA=estatico/prototipo/v3 node build.js gera o site inteiro numa subpasta.
  base: (process.env.BASE || '').replace(/\/$/, '')
};
const LOGO = C.logo.arquivo;
const B = CONFIG.base;
// Versão dos arquivos de estilo e script no link (?v=...): o navegador não usa uma cópia velha
// guardada quando o arquivo muda.
const VERSAO_ASSETS = crypto.createHash('md5')
  .update(fs.readFileSync(path.join(__dirname, 'estilo', 'site.css')))
  .update(fs.readFileSync(path.join(__dirname, 'estilo', 'site.js'))).digest('hex').slice(0, 8);
// Foto da frente da loja: aparece na vitrine (bloco "Venha nos visitar") e no topo de /loja/
// só quando o arquivo existir em estatico/.
const FOTO_LOJA = ['loja-fachada.jpg', 'loja-fachada.jpeg', 'loja-fachada.png', 'loja-fachada.webp']
  .find(n => fs.existsSync(path.join(__dirname, 'estatico', n))) || '';
const RAIZ = __dirname;
const SAIDA = path.resolve(RAIZ, process.env.SAIDA || '_site');

// ---------- utilidades ----------
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = n => 'R$ ' + Number(n).toLocaleString('pt-BR');
const km = n => Number(n).toLocaleString('pt-BR') + ' km';
const precoFinal = c => (c.preco_promocional && c.preco_promocional < c.preco) ? c.preco_promocional : c.preco;
const semAcento = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const chave = s => semAcento(s).toLowerCase().trim();
function escrever(rel, conteudo) {
  const destino = path.join(SAIDA, rel);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, conteudo);
}
function copiarPasta(origem, destino) {
  if (!fs.existsSync(origem)) return;
  for (const nome of fs.readdirSync(origem)) {
    if (B && nome === 'prototipo') continue;   // prévia não carrega as prévias antigas
    const o = path.join(origem, nome), d = path.join(destino, nome);
    if (fs.statSync(o).isDirectory()) copiarPasta(o, d);
    else { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(o, d); }
  }
}

// ---------- opcionais: destaques, procedência e grupos ----------
// Se o feed já mandar destaques/procedencia/grupos (docs/site.md seção 5), eles valem.
// Senão, a separação é feita aqui, pelos nomes que o Integrador publica (padrão do Autocerto).
// Destaques em duas classes (Isaac, 03/10):
// - RAROS: o que faz alguém escolher este carro e não outro igual. Sempre na frente.
// - MAIS PROCURADOS: o que o cliente pergunta primeiro e decide a compra. O câmbio entra sempre
//   (automático ou manual), vindo do campo câmbio. Ar-condicionado: só a melhor variante.
const RAROS = ['Teto panorâmico', 'Teto solar', 'Tração 4x4', '7 lugares', 'Câmera 360'].map(chave);
const PROCURADOS = ['Ar condicionado Digital', 'Ar condicionado dual zone', 'Ar condicionado', 'Câmera de ré', 'Bancos de Couro',
  'Multimídia', 'Direção Elétrica', 'Sensor de estacionamento', 'Piloto automático', 'Controle de velocidade',
  'Chave presencial', 'Carregador por indução', 'Rodas de liga leve'].map(chave);
const AR = ['ar condicionado digital', 'ar condicionado dual zone', 'ar condicionado'];
const PROCEDENCIA = ['Único Dono', 'IPVA Pago', 'Licenciado', 'Garantia de Fábrica', 'Revisado em Concessionária',
  'Manual do proprietário', 'Chave Reserva'].map(chave);
const MAX_PROCURADOS = 6;
const GRUPO_SEGURANCA = ['abs', 'airbag', 'alarme', 'rampa', 'estabilidade', 'tracao', 'encosto de cabeca', 'farol', 'farois',
  'isofix', 'desembacador', 'sensor', 'camera', 'ponto cego', 'permanencia', 'auto hold', 'freio', 'park assist', 'drl', 'acendimento'];
const GRUPO_TECNOLOGIA = ['multimidia', 'bluetooth', 'usb', 'computador', 'gps', 'cd player', 'carregador', 'som no volante',
  'chave presencial', 'start stop', 'piloto', 'controle de velocidade', 'espelhamento', 'painel digital', 'wi-fi'];

function organizarOpcionais(c) {
  if (c.raros || c.procurados || c.procedencia || c.grupos) {
    return { raros: c.raros || [], procurados: c.procurados || [], procedencia: c.procedencia || [], grupos: c.grupos || {} };
  }
  const lista = c.opcionais || [];
  const acha = k => lista.find(o => chave(o) === k);
  const procedencia = (c.laudo_aprovado ? ['Laudo cautelar aprovado'] : []).concat(lista.filter(o => PROCEDENCIA.includes(chave(o))));
  const raros = RAROS.map(acha).filter(Boolean)
    .filter((o, i, l) => !(chave(o) === 'teto solar' && l.some(x => chave(x) === 'teto panoramico')));
  const procurados = [];
  const cambio = String(c.cambio || '');
  if (/autom|cvt/i.test(cambio)) procurados.push('Câmbio automático');
  else if (/manual/i.test(cambio)) procurados.push('Câmbio manual');
  let temAr = false;
  PROCURADOS.forEach(k => {
    if (procurados.length >= MAX_PROCURADOS) return;
    if (AR.includes(k)) { if (temAr) return; const o = acha(k); if (o) { procurados.push(o); temAr = true; } return; }
    const o = acha(k); if (o) procurados.push(o);
  });
  const usados = new Set(raros.concat(procurados).concat(procedencia));
  const grupos = { 'Segurança': [], 'Conforto': [], 'Tecnologia': [] };
  lista.forEach(o => {
    if (usados.has(o)) return;
    const k = chave(o);
    if (GRUPO_TECNOLOGIA.some(p => k.includes(p))) grupos['Tecnologia'].push(o);
    else if (GRUPO_SEGURANCA.some(p => k.includes(p))) grupos['Segurança'].push(o);
    else grupos['Conforto'].push(o);
  });
  return { raros, procurados, procedencia, grupos };
}

const ICONES = {
  couro: '<path d="M7 20v-5h10v5M8 15V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v9"/><path d="M10 8h4"/>',
  camera: '<rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
  velocidade: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/><circle cx="12" cy="17" r="1"/>',
  tela: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M9 21h6M12 17v4"/>',
  sensor: '<path d="M5 8a10 10 0 0 1 0 8M9 10a5 5 0 0 1 0 4"/><rect x="13" y="6" width="7" height="12" rx="1.5"/>',
  portamalas: '<path d="M4 16V9l3-4h10l3 4v7z"/><path d="M4 12h16M9 16v3M15 16v3"/>',
  roda: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3.5v6M12 14.5v6M3.5 12h6M14.5 12h6"/>',
  teto: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  farol: '<path d="M14 6a6 6 0 0 1 0 12h-2V6z"/><path d="M3 8h6M3 12h6M3 16h6"/>',
  chave: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
  pessoas: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2A5 5 0 0 1 22 19"/>',
  tracao: '<rect x="4" y="3" width="4" height="7" rx="1"/><rect x="16" y="3" width="4" height="7" rx="1"/><rect x="4" y="14" width="4" height="7" rx="1"/><rect x="16" y="14" width="4" height="7" rx="1"/><path d="M8 6.5h8M8 17.5h8M12 6.5v11"/>',
  alerta: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  raio: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  cambio: '<circle cx="6" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="18" cy="5" r="1.6"/><circle cx="6" cy="19" r="1.6"/><circle cx="12" cy="19" r="1.6"/><path d="M6 6.6v10.8M12 6.6v10.8M18 6.6V12H6"/>',
  ar: '<path d="M12 2v20M4 6.5l16 11M20 6.5l-16 11"/><path d="M9.5 3.5L12 5l2.5-1.5M9.5 20.5L12 19l2.5 1.5"/>',
  direcao: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.2"/><path d="M3.5 10.5l6.4 1M14.1 11.5l6.4-1M12 14.2V21"/>',
  padrao: '<path d="M5 12.5l4.5 4.5L19 7"/>'
};
function icone(nome) {
  const n = chave(nome);
  const k = n.includes('cambio') ? 'cambio'
    : n.includes('ar condicionado') ? 'ar'
    : n.includes('direcao') ? 'direcao'
    : n.includes('couro') || n.includes('bancos eletricos') ? 'couro'
    : n.includes('camera') ? 'camera'
    : n.includes('velocidade') || n.includes('piloto') ? 'velocidade'
    : n.includes('multimidia') ? 'tela'
    : n.includes('sensor') || n.includes('park assist') ? 'sensor'
    : n.includes('porta-malas') || n.includes('porta malas') ? 'portamalas'
    : n.includes('roda') ? 'roda'
    : n.includes('teto') ? 'teto'
    : n.includes('farol') || n.includes('farois') ? 'farol'
    : n.includes('chave') ? 'chave'
    : n.includes('lugares') ? 'pessoas'
    : n.includes('4x4') ? 'tracao'
    : n.includes('ponto cego') || n.includes('faixa') ? 'alerta'
    : n.includes('inducao') ? 'raio'
    : 'padrao';
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES[k] + '</svg>';
}

// ---------- pedaços de página ----------
const ICONE_CARRO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16V12l2-5h10l2 5v4"/><path d="M3 12h18v4H3z"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/></svg>';
const ICONE_CHAVE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/></svg>';
const ICONE_TROCA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>';
const ICONE_FIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/></svg>';
const ICONE_ENVIAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2-7z"/><path d="M12 13l8-9"/></svg>';
const ICONE_ZAP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z"/></svg>';

function selos(c) {
  const s = [];
  if (c.status === 'em_preparacao') s.push('<span class="selo"><span class="t">Em preparação</span></span>');
  else if (c.novo_no_estoque) s.push('<span class="selo"><span class="t">Chegou agora</span></span>');
  if (c.preco_promocional && c.preco_promocional < c.preco) {
    s.push('<span class="selo"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5v8M2.5 6.5 6 10l3.5-3.5"/></svg><span class="t">Baixou</span><span class="v">' + brl(c.preco - c.preco_promocional) + '</span></span>');
  }
  return s.length ? '<div class="selos">' + s.join('') + '</div>' : '';
}
function precoHtml(c) {
  return '<div class="preco">' + ((c.preco_promocional && c.preco_promocional < c.preco) ? '<span class="de">' + brl(c.preco) + '</span>' : '') +
    '<span class="por">' + brl(precoFinal(c)) + '</span></div>';
}
const nomeCurto = c => [c.marca, c.modelo].filter(Boolean).join(' ') || c.titulo;
// Título completo para mensagem, aba e prévia do link: marca, modelo, versão e ano.
const nomeCompleto = c => [c.marca, c.modelo, c.versao, c.ano_modelo].filter(Boolean).join(' ') || c.titulo;
const msgCarro = c => C.msgCarro(nomeCompleto(c), brl(precoFinal(c)));

function pagina({ titulo, descricao, url, imagem, tipo, corpo, loja, evento, eventoGoogle, jsonld, semFlutuante }) {
  const px = CONFIG.pixelId;
  const gaId = CONFIG.googleAnalyticsId;
  const gadsId = CONFIG.googleAdsId;
  const tagGoogleId = gaId || gadsId;

  const pixel = px ? `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(px)}');fbq('track','PageView');${evento || ''}</script><noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${esc(px)}&ev=PageView&noscript=1"></noscript>` : '';

  const googleTag = tagGoogleId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(tagGoogleId)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${gaId ? `gtag('config','${esc(gaId)}');` : ''}${gadsId ? `gtag('config','${esc(gadsId)}');` : ''}${eventoGoogle || ''}</script>` : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${B ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="${esc(C.nome)}">
<meta property="og:locale" content="pt_BR">
<meta property="og:type" content="${tipo || 'website'}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${esc(url)}">
${imagem ? `<meta property="og:image" content="${esc(imagem)}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<meta name="theme-color" content="${esc(C.corTema)}">
<link rel="icon" href="${B}/${LOGO}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${C.fontes}">
<link rel="stylesheet" href="${B}/assets/site.css?v=${VERSAO_ASSETS}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
${pixel}
${googleTag}
</head>
<body data-whatsapp="${esc(loja.whatsapp)}" data-lead-endpoint="${esc(CONFIG.leadEndpoint)}" data-pixel="${(px || tagGoogleId) ? '1' : '0'}"${tipo === 'product' ? ' class="tem-barra"' : ''}>
<header class="topo">
  <div class="wrap">
    <a class="topo-botao topo-comprar" href="${B}/#carros">${ICONE_CARRO}<span class="longo">Compre seu carro</span><span class="curto">Comprar carro</span></a>
    <a class="topo-logo" href="${B}/" aria-label="${esc(C.nome)}, página inicial"><img class="logo" src="${B}/${LOGO}" alt="${esc(C.nome)}" width="${C.logo.largura}" height="${C.logo.altura}"></a>
    <a class="topo-botao topo-vender" href="${B}/venda-seu-carro/">${ICONE_CHAVE}<span class="longo">Venda seu carro</span><span class="curto">Vender carro</span></a>
  </div>
  <div class="flag" aria-hidden="true"></div>
</header>
${corpo}
<footer class="rodape-site"><div class="wrap">
  <div class="autorama" id="autorama">
  <svg class="pista" aria-hidden="true" focusable="false"></svg>
  <img class="logo-rodape" src="${B}/${LOGO}" alt="${esc(C.nome)}" width="${C.logo.largura}" height="${C.logo.altura}">
  <address>${esc(loja.endereco)} · ${esc(loja.bairro)}<br>${esc(loja.cidade)}${loja.uf ? ' · ' + esc(loja.uf) : ''}</address>
  <div class="rodape-links">
    <a data-zap="${esc(C.msgPadrao)}" href="https://wa.me/${esc(loja.whatsapp)}">${ICONE_ZAP}<span>${esc(loja.telefone)}</span></a>
    <a href="https://instagram.com/${esc(CONFIG.instagram)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg><span>@${esc(CONFIG.instagram)}</span></a>
  </div>
  <div class="rodape-fino"><a href="${B}/venda-seu-carro/">Venda ou troque seu carro</a> · <a href="${B}/loja/">Como chegar</a> · <a href="${B}/privacidade/">Privacidade</a></div>
  <div class="painel-pista">
    <div class="velo" aria-hidden="true"><i></i></div>
    <div class="placar" aria-live="polite"><span>Volta <b data-volta>—</b></span><span>Melhor <b data-melhor>—</b></span></div>
    <button class="acelerar" type="button">Segure para acelerar</button>
    <div class="aviso-pista" data-aviso>Segure o botão ou a própria pista.</div>
  </div>
  </div>
  <div class="assinatura"><a href="https://www.airestecnologia.com.br" target="_blank" rel="noopener" title="Aires Tecnologia"><span>Tecnologia</span><svg viewBox="4.04 8 310.05 87" width="72" height="20" role="img" aria-label="Aires"><defs><clipPath id="aires-assinatura"><rect x="-10" y="8" width="120" height="87"/></clipPath></defs><path d="M-1.35 112.68 L63.35 -9.68 M51.72 -11.87 L66.28 114.87 M82 0 V110" clip-path="url(#aires-assinatura)" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="butt"/><path d="M127.1 6.96Q132.06 6.96 136.96 8.39Q141.86 9.81 145.89 12.85Q149.92 15.89 152.4 20.6Q154.88 25.31 154.88 31.88Q154.88 36.84 153.39 41.49Q151.9 46.14 148.55 49.86Q145.2 53.58 139.87 55.82Q134.54 58.05 126.73 58.05H113.09V95.0H107.01V6.96ZM126.36 52.22Q132.93 52.22 137.27 50.36Q141.61 48.5 144.09 45.52Q146.57 42.55 147.62 39.01Q148.68 35.48 148.68 32.13Q148.68 28.16 147.25 24.69Q145.82 21.22 143.1 18.55Q140.37 15.89 136.52 14.34Q132.68 12.79 127.97 12.79H113.09V52.22ZM139 54.95 163.43 95.0H156.36L131.81 55.07ZM185.5 6.96H239.82V12.79H191.58V47.76H234.98V53.58H191.58V89.17H241.55V95.0H185.5ZM308.76 16.88Q304.92 15.02 299.34 13.41Q293.76 11.8 288.18 11.8Q279.5 11.8 274.29 16.14Q269.08 20.48 269.08 27.05Q269.08 32.01 272.06 35.29Q275.03 38.58 279.87 40.87Q284.7 43.17 290.16 45.28Q294.5 46.89 298.78 48.87Q303.06 50.86 306.53 53.71Q310.0 56.56 312.05 60.78Q314.09 64.99 314.09 71.19Q314.09 78.51 310.62 84.15Q307.15 89.79 300.95 92.89Q294.75 95.99 286.56 95.99Q279.99 95.99 274.6 94.38Q269.2 92.77 265.17 90.6Q261.14 88.43 258.79 86.94L261.64 81.98Q264.37 83.96 268.27 85.95Q272.18 87.93 276.77 89.3Q281.36 90.66 285.94 90.66Q291.28 90.66 296.3 88.55Q301.32 86.44 304.61 82.17Q307.89 77.89 307.89 71.32Q307.89 64.99 304.79 61.09Q301.69 57.18 296.86 54.7Q292.02 52.22 286.56 50.24Q282.35 48.62 278.13 46.83Q273.92 45.03 270.44 42.49Q266.97 39.94 264.93 36.35Q262.88 32.75 262.88 27.67Q262.88 21.34 266.1 16.63Q269.33 11.92 274.85 9.25Q280.36 6.59 287.43 6.46Q293.63 6.46 300.02 8.08Q306.4 9.69 311.12 12.17Z" fill="currentColor"/></svg></a></div>
</div></footer>
${tipo === 'product' || semFlutuante ? '' : `<a class="zap-flutuante" data-zap="${esc(C.msgPadrao)}" href="https://wa.me/${esc(loja.whatsapp)}" aria-label="Falar com a ${esc(C.nomeCurto)} no WhatsApp">${ICONE_ZAP}</a>`}
<div class="tela" id="tela" hidden role="dialog" aria-modal="true" aria-label="Fotos em tela cheia"></div>
<div class="cookies" id="cookies" hidden><span>Usamos cookies para medir nossos anúncios. <a href="${B}/privacidade/">Saiba mais</a></span><button type="button">Entendi</button></div>
<script src="${B}/assets/site.js?v=${VERSAO_ASSETS}" defer></script>
</body>
</html>
`;
}

function cardHtml(c, i) {
  const o = organizarOpcionais(c);
  const anos = `${c.ano_fabricacao || c.ano_modelo}/${c.ano_modelo}`;
  return `<a class="card" href="${B}/carro/${esc(c.slug)}/" data-preco="${precoFinal(c)}" data-ordem="${i}">
    <div class="foto">${selos(c)}<img loading="${i < 3 ? 'eager' : 'lazy'}" src="${esc(c.fotos[0] || B + '/' + LOGO)}" alt="${esc(nomeCompleto(c))}"></div>
    <div class="ficha"><h2 class="nome">${esc(nomeCurto(c))}</h2>${c.versao ? `<div class="versao">${esc(c.versao)}</div>` : ''}<div class="linha-dados"><span>${anos}</span><span>${km(c.km)}</span><span>${esc(c.cambio)}</span></div>${precoHtml(c)}
    ${(() => { const m = o.raros.concat(o.procurados.filter(x => !/^Câmbio/.test(x))).slice(0, 3); return m.length ? `<div class="mini-dest">${m.map((d, k) => `<span${k < o.raros.length ? ' class="raro"' : ''}>` + esc(d) + '</span>').join('')}</div>` : ''; })()}</div></a>`;
}

// Confiança e procedência (Isaac, 03/10): é o que o cliente procura na loja.
const PILARES = C.pilares;
const BLOCO_LOJA = loja => `<section class="loja" aria-labelledby="t-loja">
      <h2 class="h1" id="t-loja" style="font-size:26px">Compre com confiança</h2>
      <div class="loja-grade">${PILARES.map(([t, d]) => `<div class="loja-item"><b>${t}</b><span>${d}</span></div>`).join('')}</div>
      <a class="google" href="${esc(CONFIG.google.link)}" target="_blank" rel="noopener">${CONFIG.google.nota ? `<span class="estrela" aria-hidden="true">★</span><b>${esc(CONFIG.google.nota)}</b> no Google${CONFIG.google.total ? ` · ${esc(CONFIG.google.total)} avaliações` : ''}` : 'Ver nossas avaliações no Google'} →</a>
      <div class="endereco"><b>Venha ver de perto:</b> ${esc(loja.endereco)} · ${esc(loja.bairro)} · ${esc(loja.cidade)} · <a href="${B}/loja/">como chegar</a></div>
    </section>`;
const FAIXA_CONFIANCA = `<ul class="pilares" aria-label="${esc(C.textos.porqueComprar)}">${PILARES.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}</ul>`;

function paginaCarro(c, loja) {
  const o = organizarOpcionais(c);
  const anos = `${c.ano_fabricacao || c.ano_modelo}/${c.ano_modelo}`;
  const url = `${CONFIG.dominio}/carro/${c.slug}/`;
  const grupos = Object.entries(o.grupos).filter(([, l]) => l && l.length);
  const fotos = c.fotos.length ? c.fotos : [B + '/' + LOGO];
  const corpo = `<main class="wrap carro">
  <a class="voltar" href="${B}/">‹ Ver todos os carros</a>
  <div class="layout-carro">
    <div class="gal">
      <div class="galeria">
        <div class="trilho" id="trilho">${fotos.map((f, i) => `<img ${i ? 'loading="lazy"' : ''} src="${esc(f)}" alt="${esc(nomeCompleto(c))}, foto ${i + 1}">`).join('')}</div>
        <button type="button" class="seta ant" aria-label="Foto anterior">‹</button><button type="button" class="seta prox" aria-label="Próxima foto">›</button>
        <button type="button" class="ampliar" id="ampliar">⤢ Tela cheia</button>
        <div class="contador" id="cont">1 / ${fotos.length}</div>
      </div>
      <div class="miniaturas" id="minis">${fotos.map((f, i) => `<button type="button" data-i="${i}" aria-label="Foto ${i + 1}" aria-current="${i === 0}"><img loading="lazy" src="${esc(f)}" alt=""></button>`).join('')}</div>
    </div>
    <div class="lado">
      <div class="cab"><h1 class="h1">${esc(nomeCurto(c))}</h1>${c.versao ? `<div class="versao">${esc(c.versao)}</div>` : ''}${precoHtml(c)}${selos(c)}</div>
      <dl class="specs"><div><dt>Ano</dt><dd>${anos}</dd></div><div><dt>Quilometragem</dt><dd>${km(c.km)}</dd></div><div><dt>Câmbio</dt><dd>${esc(c.cambio || '—')}</dd></div><div><dt>Combustível</dt><dd>${esc(c.combustivel || '—')}</dd></div><div><dt>Cor</dt><dd>${esc(c.cor || '—')}</dd></div><div><dt>Motor</dt><dd>${esc(c.motor || '—')}</dd></div></dl>
      <a class="zap zap-ficha" data-zap="${esc(msgCarro(c))}" data-ref="${esc(c.id)}" href="https://wa.me/${esc(loja.whatsapp)}">${ICONE_ZAP}Chamar no WhatsApp</a>
      <div class="intencoes">
        <a class="botao2" href="${B}/venda-seu-carro/?troca=${esc(c.id)}">${ICONE_TROCA}Tenho um carro para trocar</a>
        <a class="botao2" data-zap="${esc(`Olá! Quero simular o financiamento do ${nomeCompleto(c)} (${brl(precoFinal(c))}).`)}" data-depois="Valor de entrada: R$ " data-ref="${esc(c.id)}" href="https://wa.me/${esc(loja.whatsapp)}">${ICONE_FIN}Simular financiamento</a>
        <button type="button" class="botao2" data-compartilhar data-titulo="${esc(`${nomeCompleto(c)} · ${brl(precoFinal(c))}`)}" data-url="${esc(`${CONFIG.dominio}/carro/${c.slug}/`)}">${ICONE_ENVIAR}Enviar para alguém</button>
      </div>
      ${o.raros.length || o.procurados.length ? `<section class="bloco"><h2>Destaques</h2>
        ${o.raros.length ? `<div class="sub">Diferenciais</div><div class="destaques">${o.raros.map(d => `<div class="dest raro">${icone(d)}<span>${esc(d)}</span></div>`).join('')}</div>` : ''}
        ${o.procurados.length ? `<div class="sub">Os mais procurados</div><div class="destaques">${o.procurados.map(d => `<div class="dest">${icone(d)}<span>${esc(d)}</span></div>`).join('')}</div>` : ''}
      </section>` : ''}
      ${o.procedencia.length ? `<section class="bloco"><h2>Procedência</h2><div class="proc"><ul>${o.procedencia.map(p => `<li><span class="ok" aria-hidden="true">✓</span>${esc(p)}</li>`).join('')}</ul></div></section>` : ''}
    </div>
    <div class="info">
      ${grupos.length ? `<section class="bloco"><h2>Todos os itens</h2><div>${grupos.map(([g, l]) => `<details><summary>${esc(g)}<span>${l.length} ${l.length === 1 ? 'item' : 'itens'}</span></summary><ul>${l.map(x => '<li>' + esc(x) + '</li>').join('')}</ul></details>`).join('')}</div></section>` : ''}
      ${c.descricao ? `<section class="bloco"><h2>Sobre este carro</h2><p class="descricao">${esc(c.descricao)}</p></section>` : ''}
    </div>
    ${BLOCO_LOJA(loja)}
  </div>
</main>
<div class="rodape-zap"><div class="wrap"><span class="p">${brl(precoFinal(c))}</span><a class="zap" data-zap="${esc(msgCarro(c))}" data-ref="${esc(c.id)}" href="https://wa.me/${esc(loja.whatsapp)}">${ICONE_ZAP}Chamar no WhatsApp</a></div></div>`;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Car', name: nomeCompleto(c), brand: { '@type': 'Brand', name: c.marca },
    model: c.modelo, vehicleModelDate: String(c.ano_modelo), productionDate: String(c.ano_fabricacao || c.ano_modelo),
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: c.km, unitCode: 'KMT' }, color: c.cor, fuelType: c.combustivel,
    vehicleTransmission: c.cambio, itemCondition: 'https://schema.org/UsedCondition', image: c.fotos.slice(0, 5), url,
    offers: { '@type': 'Offer', price: precoFinal(c), priceCurrency: 'BRL', availability: 'https://schema.org/InStock', url,
      seller: { '@type': 'AutoDealer', name: loja.nome } }
  };
  return pagina({
    titulo: `${nomeCompleto(c)} · ${brl(precoFinal(c))}`,
    descricao: `${km(c.km)} · ${c.cambio || ''} · ${c.combustivel || ''}. ${C.nome}, ${loja.bairro}, ${loja.cidade}.`,
    url, imagem: c.fotos[0], tipo: 'product', corpo, loja, jsonld,
    evento: `fbq('track','ViewContent',{content_ids:['${esc(c.id)}'],content_name:'${esc(nomeCompleto(c))}',content_type:'vehicle',value:${precoFinal(c)},currency:'BRL'});`,
    eventoGoogle: `gtag('event','view_item',{currency:'BRL',value:${precoFinal(c)},items:[{item_id:'${esc(c.id)}',item_name:'${esc(nomeCompleto(c))}',item_brand:'${esc(c.marca)}',price:${precoFinal(c)}}]});`
  });
}

function paginaVendido(antigo, atuais, loja) {
  const ref = antigo.preco || 0;
  const parecidos = atuais.slice().sort((a, b) => Math.abs(precoFinal(a) - ref) - Math.abs(precoFinal(b) - ref)).slice(0, 3);
  const corpo = `<main class="wrap vendido">
  <div class="aviso">
    ${antigo.foto ? `<img src="${esc(antigo.foto)}" alt="${esc(antigo.titulo)}">` : ''}
    <h1 class="h1" style="font-size:clamp(32px,6vw,48px)">Este carro já foi vendido</h1>
    <p>O ${esc(antigo.titulo)} já saiu da loja. Veja carros parecidos ou diga o que você procura que avisamos quando chegar.</p>
    <div><a class="zap" data-zap="Olá! Vi no site que o ${esc(antigo.titulo)} foi vendido. Vocês têm algo parecido?" href="https://wa.me/${esc(loja.whatsapp)}">${ICONE_ZAP}Procurar um parecido</a></div>
  </div>
  ${parecidos.length ? `<h2 class="h1" style="font-size:28px">Carros parecidos</h2><div class="vitrine">${parecidos.map(cardHtml).join('')}</div>` : ''}
</main>`;
  return pagina({
    titulo: `${antigo.titulo} · vendido · ${C.nome}`, descricao: `O ${antigo.titulo} já foi vendido. Veja carros parecidos na ${C.nome}.`,
    url: `${CONFIG.dominio}/carro/${antigo.slug}/`, imagem: antigo.foto, corpo, loja
  });
}

// Todos os carros que já apareceram em alguma versão publicada de dados/estoque.json (histórico do git).
function carrosDoHistorico() {
  const vistos = {};
  try {
    const shas = execSync('git log --format=%H -- dados/estoque.json', { cwd: RAIZ, encoding: 'utf8' }).split('\n').filter(Boolean);
    for (const sha of shas.reverse()) {
      let dados;
      try { dados = JSON.parse(execSync(`git show ${sha}:dados/estoque.json`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 50e6 })); } catch (e) { continue; }
      (dados.carros || []).forEach(c => { vistos[c.slug] = { slug: c.slug, titulo: nomeCompleto(c), foto: (c.fotos || [])[0] || '', preco: precoFinal(c) }; });
    }
  } catch (e) { console.warn('Histórico do git indisponível (' + e.message.split('\n')[0] + '). Páginas de vendido só para o que já existe.'); }
  return vistos;
}

// Topo da vitrine: o slogan da loja e um carro em destaque (o de maior preço), como a luz da cena.
function linkMapa(loja) {
  return loja.latitude && loja.longitude ? `https://www.google.com/maps/search/?api=1&query=${loja.latitude},${loja.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${C.nome}, ${loja.endereco}, ${loja.bairro}, ${loja.cidade}`)}`;
}
function visiteHtml(loja) {
  if (!FOTO_LOJA) return '';
  return `<section class="visite" aria-labelledby="t-visite">
    <img src="${B}/${FOTO_LOJA}" alt="Fachada da ${esc(C.nome)}" loading="lazy">
    <div class="visite-texto">
      <div class="eyebrow">Venha nos visitar</div>
      <h2 class="h1" id="t-visite">${esc(C.textos.visiteTitulo)}</h2>
      <p>${esc(loja.endereco)} · ${esc(loja.bairro)} · ${esc(loja.cidade)}</p>
      <a class="hero-link" href="${esc(linkMapa(loja))}" target="_blank" rel="noopener">Abrir no mapa</a>
    </div>
  </section>`;
}
function heroHtml(carros, loja) {
  // Vitrine giratória: todos os carros disponíveis com foto, começando pelo de maior preço.
  // Troca a cada 7 s (estilo/site.js). Sem contador: o site nunca mostra o tamanho do estoque.
  const lista = carros.filter(c => c.status !== 'em_preparacao' && c.fotos.length)
    .sort((a, b) => precoFinal(b) - precoFinal(a))
    .map(c => ({ img: c.fotos[0], nome: nomeCurto(c), ano: String(c.ano_modelo), preco: brl(precoFinal(c)), href: `${B}/carro/${c.slug}/`, alt: nomeCompleto(c) }));
  const c = lista[0];
  return `<section class="hero">
    <div class="hero-texto">
      <div class="eyebrow">${esc(C.nome)} · ${esc(loja.cidade)}</div>
      <h1 class="hero-titulo">${C.textos.heroHtml}</h1>
      <div class="hero-regua" aria-hidden="true"></div>
      <a class="hero-link" href="#carros">Ver os carros</a>
    </div>
    ${c ? `<a class="hero-carro" id="hero-carro" href="${esc(c.href)}" data-lista="${esc(JSON.stringify(lista))}">
      <span class="hero-frame">
        <span class="sombra" aria-hidden="true"></span>
        <span class="janela"><img class="ativa" src="${esc(c.img)}" alt="${esc(c.alt)}"><img alt="" aria-hidden="true"></span>
        <span class="canto" aria-hidden="true"></span>
      </span>
      <span class="hero-barra" aria-hidden="true"><i></i></span>
      <span class="hero-legenda"><span><b>${esc(c.nome)}</b> <span class="ano">${esc(c.ano)}</span></span><span class="preco-h">${esc(c.preco)}</span><span class="ver">Ver carro →</span></span>
    </a>` : ''}
  </section>`;
}

const MARCAS = ['Audi', 'BMW', 'BYD', 'Caoa Chery', 'Chevrolet', 'Citroën', 'Fiat', 'Ford', 'GWM', 'Honda', 'Hyundai', 'Jeep',
  'Kia', 'Land Rover', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Peugeot', 'Ram', 'Renault', 'Toyota', 'Volkswagen', 'Volvo'];
// Venda ou troca do carro do cliente (fase 1): passo a passo no próprio navegador, sem guardar
// nada no site. No fim, monta a mensagem e abre o WhatsApp da loja. As fotos vão na conversa.
function paginaVendaSeuCarro(carros, loja) {
  const anoAtual = new Date().getFullYear() + 1;
  const anos = []; for (let a = anoAtual; a >= anoAtual - 25; a--) anos.push(a);
  const interesses = carros.map(c => ({ id: c.id, nome: `${nomeCompleto(c)} (${brl(precoFinal(c))})` }));
  const corpo = `<main class="wrap venda" id="venda" data-interesses="${esc(JSON.stringify(interesses))}">
  <div class="venda-topo">
    <div class="eyebrow">Avaliação do seu carro</div>
    <h1 class="h1 venda-titulo">${C.textos.vendaTituloHtml}</h1>
    <p class="venda-sub">Responda em menos de um minuto. A conversa continua no WhatsApp, com quem avalia o carro.</p>
  </div>
  <div class="progresso" aria-hidden="true"><i id="barra"></i><span class="chegada"></span></div>

  <form id="form-venda" novalidate>
    <section class="passo" data-passo="1">
      <h2 class="pergunta">O que você quer fazer?</h2>
      <div class="opcoes" role="radiogroup" aria-label="O que você quer fazer">
        <button type="button" class="opcao" data-campo="intencao" data-valor="vender"><b>Vender meu carro</b><span>${esc(C.textos.vendaOpcoes.vender)}</span></button>
        <button type="button" class="opcao" data-campo="intencao" data-valor="trocar"><b>${esc(C.textos.vendaOpcoes.trocar)}</b><span>Seu carro entra como parte do pagamento.</span></button>
        <button type="button" class="opcao" data-campo="intencao" data-valor="consignar"><b>Deixar em consignação</b><span>${esc(C.textos.vendaOpcoes.consignar)}</span></button>
      </div>
    </section>

    <section class="passo" data-passo="2" hidden>
      <h2 class="pergunta">Qual é o seu carro?</h2>
      <div class="campos">
        <label>Marca<input id="marca" list="lista-marcas" autocomplete="off" placeholder="Ex.: Fiat" required></label>
        <datalist id="lista-marcas">${MARCAS.map(m => `<option value="${esc(m)}">`).join('')}</datalist>
        <label>Modelo<input id="modelo" autocomplete="off" placeholder="Ex.: Argo" required></label>
        <label>Versão <small>(se souber)</small><input id="versao" autocomplete="off" placeholder="Ex.: Drive 1.0"></label>
        <label>Ano do modelo<select id="ano" required><option value="">Escolha</option>${anos.map(a => `<option>${a}</option>`).join('')}</select></label>
        <label>Quilometragem<input id="km" inputmode="numeric" autocomplete="off" placeholder="Ex.: 45.000" required></label>
        <label>Câmbio<select id="cambio"><option value="">Escolha</option><option>Automático</option><option>Manual</option></select></label>
      </div>
      <p class="erro" id="erro2" hidden>Preencha marca, modelo, ano e quilometragem.</p>
      <div class="navegar"><button type="button" class="voltar-passo">‹ Voltar</button><button type="button" class="zap avancar">Continuar</button></div>
    </section>

    <section class="passo" data-passo="3" hidden>
      <h2 class="pergunta">Como ele está?</h2>
      <p class="dica">Toque no que for verdade. Pode pular.</p>
      <div class="marcas">
        <button type="button" class="marca" data-sinal="Único dono" aria-pressed="false">Único dono</button>
        <button type="button" class="marca" data-sinal="IPVA pago" aria-pressed="false">IPVA pago</button>
        <button type="button" class="marca" data-sinal="Revisões em dia" aria-pressed="false">Revisões em dia</button>
        <button type="button" class="marca" data-sinal="Manual e chave reserva" aria-pressed="false">Manual e chave reserva</button>
        <button type="button" class="marca" data-sinal="Financiado (ainda pagando)" aria-pressed="false">Ainda está financiado</button>
        <button type="button" class="marca" data-sinal="Já teve batida" aria-pressed="false">Já teve batida</button>
      </div>
      <label class="largo">Algo mais que a gente deva saber? <small>(opcional)</small><textarea id="obs" rows="3" placeholder="Ex.: pneus novos, pequeno risco na porta"></textarea></label>
      <div class="navegar"><button type="button" class="voltar-passo">‹ Voltar</button><button type="button" class="zap avancar">Continuar</button></div>
    </section>

    <section class="passo" data-passo="4" hidden>
      <h2 class="pergunta">Quase lá.</h2>
      <div class="campos">
        <label>Seu nome<input id="nome" autocomplete="given-name" placeholder="Como podemos te chamar?"></label>
        <label>WhatsApp <small>(opcional)</small><input id="telefone" type="tel" inputmode="tel" autocomplete="tel" placeholder="Ex.: 31 99999-9999"></label>
        <label class="so-troca largo" hidden>${esc(C.textos.vendaInteresse)} <small>(opcional)</small><input id="interesse" list="lista-interesses" autocomplete="off" placeholder="Ex.: Jeep Compass"></label>
        <datalist id="lista-interesses"></datalist>
      </div>
      <div class="resumo" id="resumo"></div>
      <p class="dica">Na conversa, mande 4 fotos: frente, traseira, interior e painel mostrando a quilometragem. Com elas a avaliação sai mais rápido.</p>
      <div class="navegar"><button type="button" class="voltar-passo">‹ Voltar</button><a class="zap" id="enviar-venda" data-zap="" href="https://wa.me/${esc(loja.whatsapp)}">${ICONE_ZAP}Enviar pelo WhatsApp</a></div>
      <p class="letra-miuda">Ao enviar pelo WhatsApp, você concorda com o contato da equipe da Grid para atendimento e avaliação.</p>
    </section>
  </form>
</main>`;
  return pagina({
    titulo: `Venda ou troque seu carro · ${C.nome}`,
    descricao: `Avaliação do seu carro para venda, troca ou consignação na ${C.nome}, ${loja.cidade}.`,
    url: CONFIG.dominio + '/venda-seu-carro/', corpo, loja, semFlutuante: true
  });
}

// ---------- montagem ----------
function montar() {
  const dados = JSON.parse(fs.readFileSync(path.join(RAIZ, 'dados', 'estoque.json'), 'utf8'));
  const loja = Object.assign({ whatsapp: CONFIG.whatsappPadrao, telefone: C.telefonePadrao }, dados.loja || {});
  const carros = (dados.carros || []).filter(c => c && c.slug && c.id);

  fs.rmSync(SAIDA, { recursive: true, force: true });
  fs.mkdirSync(SAIDA, { recursive: true });
  copiarPasta(path.join(RAIZ, 'estatico'), SAIDA);
  copiarPasta(path.join(RAIZ, 'estilo'), path.join(SAIDA, 'assets'));
  copiarPasta(path.join(RAIZ, 'dados'), path.join(SAIDA, 'dados'));

  // vitrine
  const FAIXAS = [['todos', 'Todos'], ['ate80', 'Até R$ 80 mil'], ['80a120', 'R$ 80 a 120 mil'], ['mais120', 'Acima de R$ 120 mil']];
  const vitrine = `<main class="wrap">
  ${heroHtml(carros, loja)}
  ${FAIXA_CONFIANCA}
  <div class="eyebrow-secao" id="carros">Na loja agora</div>
  <div class="filtros" role="group" aria-label="Faixa de preço">${FAIXAS.map(([k, n]) => `<button type="button" class="chip" data-faixa="${k}" aria-pressed="${k === 'todos'}">${n}</button>`).join('')}
    <select id="ordem" class="ordem" aria-label="Ordenar"><option value="recentes">Mais recentes</option><option value="menor">Menor preço</option><option value="maior">Maior preço</option></select></div>
  <div class="vitrine" id="vitrine">${carros.map(cardHtml).join('')}</div>
  <div class="vazio" id="vazio" ${carros.length ? 'hidden' : ''}><div class="h1">Não temos agora.</div><p>Diga o que você procura e avisamos quando chegar.</p><a class="zap" data-zap="Olá! Estou procurando um carro e queria ser avisado quando chegar." href="https://wa.me/${esc(loja.whatsapp)}">${ICONE_ZAP}Me avise quando chegar</a></div>
  ${visiteHtml(loja)}
</main>`;
  escrever('index.html', pagina({
    titulo: C.textos.tituloInicio,
    descricao: C.textos.descricaoInicio(loja.cidade),
    url: CONFIG.dominio + '/', imagem: carros[0] && carros[0].fotos[0], corpo: vitrine, loja
  }));

  // páginas dos carros
  carros.forEach(c => escrever(`carro/${c.slug}/index.html`, paginaCarro(c, loja)));

  // vendidos: todo slug que já existiu e não está no estoque atual
  const atuais = new Set(carros.map(c => c.slug));
  const historico = carrosDoHistorico();
  const vendidos = Object.values(historico).filter(a => !atuais.has(a.slug));
  vendidos.forEach(a => escrever(`carro/${a.slug}/index.html`, paginaVendido(a, carros, loja)));

  // a loja
  const mapa = loja.latitude && loja.longitude ? `https://www.google.com/maps/search/?api=1&query=${loja.latitude},${loja.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loja.endereco}, ${loja.bairro}, ${loja.cidade}`)}`;
  escrever('loja/index.html', pagina({
    titulo: `A loja · ${C.nome}`, descricao: `${C.nome}: ${loja.endereco}, ${loja.bairro}, ${loja.cidade}.`,
    url: CONFIG.dominio + '/loja/', loja,
    corpo: `<main class="wrap texto">
  ${FOTO_LOJA ? `<img class="foto-loja" src="${B}/${FOTO_LOJA}" alt="Fachada da ${esc(C.nome)}">` : ''}
  <h1 class="h1" style="font-size:clamp(36px,6vw,56px)">A loja</h1>
  <p><b>${esc(loja.endereco)}</b><br>${esc(loja.bairro)} · ${esc(loja.cidade)}${loja.uf ? ' · ' + esc(loja.uf) : ''}${loja.cep ? ' · CEP ' + esc(String(loja.cep).replace(/(\d{5})(\d{3})/, '$1-$2')) : ''}</p>
  <p><a class="zap" href="${esc(mapa)}" target="_blank" rel="noopener">Abrir no mapa</a></p>
  <p>WhatsApp: <b>${esc(loja.telefone)}</b></p>
  <p><a class="zap" data-zap="${esc(C.msgPadrao)}" href="https://wa.me/${esc(loja.whatsapp)}">${ICONE_ZAP}Chamar no WhatsApp</a></p>
  ${BLOCO_LOJA(loja)}
</main>`
  }));

  escrever('venda-seu-carro/index.html', paginaVendaSeuCarro(carros, loja));

  escrever('privacidade/index.html', pagina({
    titulo: `Privacidade · ${C.nome}`, descricao: `Como o site da ${C.nome} usa dados e cookies.`,
    url: CONFIG.dominio + '/privacidade/', loja,
    corpo: `<main class="wrap texto">
  <h1 class="h1" style="font-size:clamp(36px,6vw,56px)">Privacidade</h1>
  <p>Este site não exige cadastro prévio para visualização do estoque. Quando você toca em "Chamar no WhatsApp", "Simular financiamento" ou solicita uma avaliação na página de venda/troca, seus dados de contato e interesse são processados com seu consentimento exclusivamente para que a equipe de vendas da ${esc(C.nome)} realize o atendimento solicitado.</p>
  <p>Usamos o pixel da Meta (Facebook e Instagram) para saber quais anúncios trazem visitas e contatos. Ele usa cookies do seu navegador. Você pode bloquear esses cookies nas configurações do navegador sem perder nada do site.</p>
  <p>Dúvidas sobre seus dados: fale com a gente pelo WhatsApp ${esc(loja.telefone)}.</p>
</main>`
  }));

  escrever('404.html', pagina({
    titulo: `Página não encontrada · ${C.nome}`, descricao: `Esta página não existe. Veja os carros da ${C.nome}.`,
    url: CONFIG.dominio + '/', loja,
    corpo: `<main class="wrap vendido"><h1 class="h1" style="font-size:clamp(32px,6vw,48px)">Esta página não existe</h1><p>Mas os carros existem. Veja os que estão na loja agora.</p>
  <div class="vitrine">${carros.slice(0, 6).map(cardHtml).join('')}</div><p><a class="zap" href="${B}/">Ver todos os carros</a></p></main>`
  }));

  const urls = ['/', '/loja/'].concat(carros.map(c => `/carro/${c.slug}/`));
  escrever('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${CONFIG.dominio}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  escrever('robots.txt', `User-agent: *\nDisallow: /prototipo/\nSitemap: ${CONFIG.dominio}/sitemap.xml\n`);

  console.log(`Site montado: ${carros.length} carros, ${vendidos.length} páginas de vendido, pixel ${CONFIG.pixelId ? 'ligado' : 'desligado'}, google ${CONFIG.googleAnalyticsId || CONFIG.googleAdsId ? 'ligado' : 'desligado'}.`);
}

montar();
