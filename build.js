#!/usr/bin/env node
/*
 * Monta o site da Grid a partir de dados/estoque.json (publicado pelo Integrador).
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

// ---------- configuração ----------
const CONFIG = {
  dominio: 'https://www.gridbh.com',
  // ID do pixel da Meta. Vazio = sem pixel e sem aviso de cookies.
  pixelId: process.env.PIXEL_ID || '',
  whatsappPadrao: '5531996011999'
};
const RAIZ = __dirname;
const SAIDA = path.join(RAIZ, '_site');

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
    const o = path.join(origem, nome), d = path.join(destino, nome);
    if (fs.statSync(o).isDirectory()) copiarPasta(o, d);
    else { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(o, d); }
  }
}

// ---------- opcionais: destaques, procedência e grupos ----------
// Se o feed já mandar destaques/procedencia/grupos (docs/site.md seção 5), eles valem.
// Senão, a separação é feita aqui, pelos nomes que o Integrador publica (padrão do Autocerto).
const DESTAQUES = ['Teto panorâmico', 'Teto solar', 'Bancos de Couro', 'Bancos elétricos', 'Câmera 360', 'Câmera de ré',
  'Piloto automático', 'Controle de velocidade', 'Carregador por indução', 'Chave presencial', 'Alerta de ponto cego',
  'Assistente de permanência em faixa', 'Park Assist', 'Tração 4x4', '7 lugares', 'Multimídia', 'Porta-malas elétrico',
  'Farol de LED', 'Sensor de estacionamento', 'Rodas de liga leve'].map(chave);
const PROCEDENCIA = ['Único Dono', 'IPVA Pago', 'Licenciado', 'Garantia de Fábrica', 'Revisado em Concessionária',
  'Manual do proprietário', 'Chave Reserva'].map(chave);
const MAX_DESTAQUES = 6;
const GRUPO_SEGURANCA = ['abs', 'airbag', 'alarme', 'rampa', 'estabilidade', 'tracao', 'encosto de cabeca', 'farol', 'farois',
  'isofix', 'desembacador', 'sensor', 'camera', 'ponto cego', 'permanencia', 'auto hold', 'freio', 'park assist', 'drl', 'acendimento'];
const GRUPO_TECNOLOGIA = ['multimidia', 'bluetooth', 'usb', 'computador', 'gps', 'cd player', 'carregador', 'som no volante',
  'chave presencial', 'start stop', 'piloto', 'controle de velocidade', 'espelhamento', 'painel digital', 'wi-fi'];

function organizarOpcionais(c) {
  if (c.destaques || c.procedencia || c.grupos) {
    return { destaques: c.destaques || [], procedencia: c.procedencia || [], grupos: c.grupos || {} };
  }
  const lista = c.opcionais || [];
  const procedencia = lista.filter(o => PROCEDENCIA.includes(chave(o)));
  const destaques = DESTAQUES.map(d => lista.find(o => chave(o) === d)).filter(Boolean).slice(0, MAX_DESTAQUES);
  const grupos = { 'Segurança': [], 'Conforto': [], 'Tecnologia': [] };
  lista.forEach(o => {
    if (procedencia.includes(o) || destaques.includes(o)) return;
    const k = chave(o);
    if (GRUPO_TECNOLOGIA.some(p => k.includes(p))) grupos['Tecnologia'].push(o);
    else if (GRUPO_SEGURANCA.some(p => k.includes(p))) grupos['Segurança'].push(o);
    else grupos['Conforto'].push(o);
  });
  return { destaques, procedencia, grupos };
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
  padrao: '<path d="M5 12.5l4.5 4.5L19 7"/>'
};
function icone(nome) {
  const n = chave(nome);
  const k = n.includes('couro') || n.includes('bancos eletricos') ? 'couro'
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
const msgCarro = c => `Olá! Vi o ${nomeCompleto(c)} (${brl(precoFinal(c))}) no site da Grid.`;

function pagina({ titulo, descricao, url, imagem, tipo, corpo, loja, evento, jsonld }) {
  const px = CONFIG.pixelId;
  const pixel = px ? `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(px)}');fbq('track','PageView');${evento || ''}</script>` : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="Grid Automóveis">
<meta property="og:locale" content="pt_BR">
<meta property="og:type" content="${tipo || 'website'}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${esc(url)}">
${imagem ? `<meta property="og:image" content="${esc(imagem)}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<meta name="theme-color" content="#121214">
<link rel="icon" href="/grid-logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,400..900;1,62..125,700..900&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/assets/site.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
${pixel}
</head>
<body data-whatsapp="${esc(loja.whatsapp)}" data-pixel="${px ? '1' : '0'}">
<header class="topo">
  <div class="wrap">
    <a href="/" aria-label="Grid Automóveis, início"><img class="logo" src="/grid-logo.png" alt="Grid Automóveis" width="88" height="40"></a>
    <a class="zap" data-zap="Olá! Vim pelo site da Grid." href="https://wa.me/${esc(loja.whatsapp)}">${ICONE_ZAP}WhatsApp</a>
  </div>
  <div class="flag" aria-hidden="true"></div>
</header>
${corpo}
<footer class="rodape-site"><div class="wrap">
  <div><b>Grid Automóveis</b> · ${esc(loja.endereco)} · ${esc(loja.bairro)} · ${esc(loja.cidade)}</div>
  <div>WhatsApp ${esc(loja.telefone)} · <a href="/loja/">Como chegar</a> · <a href="/privacidade/">Privacidade</a></div>
</div></footer>
<div class="tela" id="tela" hidden role="dialog" aria-modal="true" aria-label="Fotos em tela cheia"></div>
<div class="cookies" id="cookies" hidden><span>Usamos cookies para medir nossos anúncios. <a href="/privacidade/">Saiba mais</a></span><button type="button">Entendi</button></div>
<script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

function cardHtml(c, i) {
  const o = organizarOpcionais(c);
  const anos = `${c.ano_fabricacao || c.ano_modelo}/${c.ano_modelo}`;
  return `<a class="card" href="/carro/${esc(c.slug)}/" data-preco="${precoFinal(c)}" data-ordem="${i}">
    <div class="foto">${selos(c)}<img loading="${i < 3 ? 'eager' : 'lazy'}" src="${esc(c.fotos[0] || '/grid-logo.png')}" alt="${esc(nomeCompleto(c))}"></div>
    <div class="ficha"><h2 class="nome">${esc(nomeCurto(c))}</h2>${c.versao ? `<div class="versao">${esc(c.versao)}</div>` : ''}<div class="linha-dados"><span>${anos}</span><span>${km(c.km)}</span><span>${esc(c.cambio)}</span></div>${precoHtml(c)}
    ${o.destaques.length ? `<div class="mini-dest">${o.destaques.slice(0, 3).map(d => '<span>' + esc(d) + '</span>').join('')}</div>` : ''}</div></a>`;
}

const BLOCO_LOJA = loja => `<section class="loja" aria-labelledby="t-loja">
      <h2 class="h1" id="t-loja" style="font-size:26px">Comprar na Grid</h2>
      <div class="loja-grade">
        <div class="loja-item"><b>Fotos do próprio carro</b><span>Todas as fotos são feitas aqui na loja, do carro que você vai ver.</span></div>
        <div class="loja-item"><b>Seu carro na troca</b><span>Avaliamos o seu usado como parte do pagamento.</span></div>
        <div class="loja-item"><b>Financiamento</b><span>Fazemos a simulação com os bancos com que trabalhamos.</span></div>
        <div class="loja-item"><b>Transferência pela loja</b><span>Cuidamos da documentação para você sair dirigindo tranquilo.</span></div>
      </div>
      <div class="endereco"><b>Venha ver de perto:</b> ${esc(loja.endereco)} · ${esc(loja.bairro)} · ${esc(loja.cidade)} · <a href="/loja/">como chegar</a></div>
    </section>`;

function paginaCarro(c, loja) {
  const o = organizarOpcionais(c);
  const anos = `${c.ano_fabricacao || c.ano_modelo}/${c.ano_modelo}`;
  const url = `${CONFIG.dominio}/carro/${c.slug}/`;
  const grupos = Object.entries(o.grupos).filter(([, l]) => l && l.length);
  const fotos = c.fotos.length ? c.fotos : ['/grid-logo.png'];
  const corpo = `<main class="wrap carro">
  <a class="voltar" href="/">‹ Ver todos os carros</a>
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
      ${o.destaques.length ? `<section class="bloco"><h2>Destaques</h2><div class="destaques">${o.destaques.map(d => `<div class="dest">${icone(d)}<span>${esc(d)}</span></div>`).join('')}</div></section>` : ''}
      ${o.procedencia.length ? `<section class="bloco"><h2>Procedência</h2><div class="proc"><ul>${o.procedencia.map(p => `<li><span class="ok" aria-hidden="true">✓</span>${esc(p)}</li>`).join('')}</ul></div></section>` : ''}
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
    descricao: `${km(c.km)} · ${c.cambio || ''} · ${c.combustivel || ''}. Grid Automóveis, ${loja.bairro}, ${loja.cidade}.`,
    url, imagem: c.fotos[0], tipo: 'product', corpo, loja, jsonld,
    evento: `fbq('track','ViewContent',{content_ids:['${esc(c.id)}'],content_type:'vehicle'});`
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
    titulo: `${antigo.titulo} · vendido · Grid Automóveis`, descricao: `O ${antigo.titulo} já foi vendido. Veja carros parecidos na Grid Automóveis.`,
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

// ---------- montagem ----------
function montar() {
  const dados = JSON.parse(fs.readFileSync(path.join(RAIZ, 'dados', 'estoque.json'), 'utf8'));
  const loja = Object.assign({ whatsapp: CONFIG.whatsappPadrao, telefone: '31 99601-1999' }, dados.loja || {});
  const carros = (dados.carros || []).filter(c => c && c.slug && c.id);

  fs.rmSync(SAIDA, { recursive: true, force: true });
  fs.mkdirSync(SAIDA, { recursive: true });
  copiarPasta(path.join(RAIZ, 'estatico'), SAIDA);
  copiarPasta(path.join(RAIZ, 'estilo'), path.join(SAIDA, 'assets'));
  copiarPasta(path.join(RAIZ, 'dados'), path.join(SAIDA, 'dados'));

  // vitrine
  const FAIXAS = [['todos', 'Todos'], ['ate80', 'Até R$ 80 mil'], ['80a120', 'R$ 80 a 120 mil'], ['mais120', 'Acima de R$ 120 mil']];
  const vitrine = `<main class="wrap">
  <section class="intro"><h1 class="h1">Seminovos selecionados em BH</h1><p>Fotos de verdade, ficha completa e o preço na tela. Gostou de um? Chama a gente no WhatsApp.</p></section>
  <div class="filtros" role="group" aria-label="Faixa de preço">${FAIXAS.map(([k, n]) => `<button type="button" class="chip" data-faixa="${k}" aria-pressed="${k === 'todos'}">${n}</button>`).join('')}
    <select id="ordem" class="ordem" aria-label="Ordenar"><option value="recentes">Mais recentes</option><option value="menor">Menor preço</option><option value="maior">Maior preço</option></select></div>
  <div class="vitrine" id="vitrine">${carros.map(cardHtml).join('')}</div>
  <div class="vazio" id="vazio" ${carros.length ? 'hidden' : ''}><div class="h1">Não temos agora.</div><p>Diga o que você procura e avisamos quando chegar.</p><a class="zap" data-zap="Olá! Estou procurando um carro e queria ser avisado quando chegar." href="https://wa.me/${esc(loja.whatsapp)}">${ICONE_ZAP}Me avise quando chegar</a></div>
</main>`;
  escrever('index.html', pagina({
    titulo: 'Grid Automóveis · Seminovos em Belo Horizonte',
    descricao: `Seminovos selecionados em ${loja.cidade}. Fotos de verdade, ficha completa e o preço na tela.`,
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
    titulo: 'A loja · Grid Automóveis', descricao: `Grid Automóveis: ${loja.endereco}, ${loja.bairro}, ${loja.cidade}.`,
    url: CONFIG.dominio + '/loja/', loja,
    corpo: `<main class="wrap texto">
  <h1 class="h1" style="font-size:clamp(36px,6vw,56px)">A loja</h1>
  <p><b>${esc(loja.endereco)}</b><br>${esc(loja.bairro)} · ${esc(loja.cidade)}${loja.uf ? ' · ' + esc(loja.uf) : ''}${loja.cep ? ' · CEP ' + esc(String(loja.cep).replace(/(\d{5})(\d{3})/, '$1-$2')) : ''}</p>
  <p><a class="zap" href="${esc(mapa)}" target="_blank" rel="noopener">Abrir no mapa</a></p>
  <p>WhatsApp: <b>${esc(loja.telefone)}</b></p>
  <p><a class="zap" data-zap="Olá! Vim pelo site da Grid." href="https://wa.me/${esc(loja.whatsapp)}">${ICONE_ZAP}Chamar no WhatsApp</a></p>
  ${BLOCO_LOJA(loja)}
</main>`
  }));

  escrever('privacidade/index.html', pagina({
    titulo: 'Privacidade · Grid Automóveis', descricao: 'Como o site da Grid Automóveis usa dados e cookies.',
    url: CONFIG.dominio + '/privacidade/', loja,
    corpo: `<main class="wrap texto">
  <h1 class="h1" style="font-size:clamp(36px,6vw,56px)">Privacidade</h1>
  <p>Este site não pede cadastro nem guarda seus dados. Quando você toca em "Chamar no WhatsApp", a conversa acontece no WhatsApp, com a mensagem que você decidir enviar.</p>
  <p>Usamos o pixel da Meta (Facebook e Instagram) para saber quais anúncios trazem visitas e contatos. Ele usa cookies do seu navegador. Você pode bloquear esses cookies nas configurações do navegador sem perder nada do site.</p>
  <p>Dúvidas: fale com a gente pelo WhatsApp ${esc(loja.telefone)}.</p>
</main>`
  }));

  escrever('404.html', pagina({
    titulo: 'Página não encontrada · Grid Automóveis', descricao: 'Esta página não existe. Veja os carros da Grid Automóveis.',
    url: CONFIG.dominio + '/', loja,
    corpo: `<main class="wrap vendido"><h1 class="h1" style="font-size:clamp(32px,6vw,48px)">Esta página não existe</h1><p>Mas os carros existem. Veja os que estão na loja agora.</p>
  <div class="vitrine">${carros.slice(0, 6).map(cardHtml).join('')}</div><p><a class="zap" href="/">Ver todos os carros</a></p></main>`
  }));

  const urls = ['/', '/loja/'].concat(carros.map(c => `/carro/${c.slug}/`));
  escrever('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${CONFIG.dominio}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  escrever('robots.txt', `User-agent: *\nDisallow: /prototipo/\nSitemap: ${CONFIG.dominio}/sitemap.xml\n`);

  console.log(`Site montado: ${carros.length} carros, ${vendidos.length} páginas de vendido, pixel ${CONFIG.pixelId ? 'ligado' : 'desligado'}.`);
}

montar();
