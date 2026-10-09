/* Grid Automóveis — comportamento do site (sem bibliotecas). */
(function () {
  'use strict';
  var NUMERO = document.body.getAttribute('data-whatsapp');
  var ENDPOINT_LEAD = document.body.getAttribute('data-lead-endpoint') || 'https://script.google.com/macros/s/AKfycbx7DP48bTN9lGJwMQhOCcncLoeAFrP7-IERQWeP-SmYV8VYsFq0BbW1AVY_ZEzvtkprFw/exec';

  // ---------- origem da visita (vai na mensagem do WhatsApp) ----------
  function origemDaVisita() {
    var salva = null;
    try { salva = sessionStorage.getItem('grid-origem'); } catch (e) {}
    var q = new URLSearchParams(location.search);
    var fonte = (q.get('utm_source') || '').toLowerCase();
    var nova = null;
    if (/meta|instagram|facebook|^fb$|^ig$/.test(fonte) || q.get('fbclid')) nova = 'via Instagram/Facebook';
    else if (/google/.test(fonte) || q.get('gclid')) nova = 'via Google';
    else if (fonte) nova = 'via ' + fonte;
    if (nova) { try { sessionStorage.setItem('grid-origem', nova); } catch (e) {} return nova; }
    return salva || 'via site';
  }
  var ORIGEM = origemDaVisita();

  // ---------- envio automático de lead para o Integrador (Fase 5) ----------
  var ultimoEnvioLead = 0;
  var ultimaChaveLead = '';

  function enviarLeadIntegrador(dados) {
    if (!ENDPOINT_LEAD || !dados) return;
    var chave = (dados.ref || '') + '|' + (dados.mensagem || '') + '|' + (dados.troca_modelo || '');
    var agora = Date.now();
    if (chave === ultimaChaveLead && agora - ultimoEnvioLead < 8000) return;
    ultimaChaveLead = chave;
    ultimoEnvioLead = agora;

    try {
      var q = new URLSearchParams(location.search);
      var leadId = '';
      try { leadId = sessionStorage.getItem('grid-lead-id') || ''; } catch (e) {}

      var payload = {
        action: 'capturarLeadSite',
        lead_id: leadId,
        nome: (dados.nome || '').trim() || 'Visitante do Site',
        telefone: (dados.telefone || '').trim(),
        ref: dados.ref || '',
        placa_interesse: dados.placa_interesse || '',
        modelo_interesse: dados.modelo_interesse || '',
        mensagem: dados.mensagem || '',
        notas: dados.notas || '',
        utm_source: q.get('utm_source') || '',
        utm_campaign: q.get('utm_campaign') || '',
        utm_medium: q.get('utm_medium') || '',
        pagina_origem: window.location.href,
        valor_proposta: dados.valor_proposta || '',
        condicao_pagamento: dados.condicao_pagamento || '',
        troca_placa: dados.troca_placa || '',
        troca_modelo: dados.troca_modelo || '',
        troca_valor: dados.troca_valor || '',
        empresa_verificacao: '',
        consentimento_lgpd: true
      };

      fetch(ENDPOINT_LEAD, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        keepalive: true
      }).then(function (r) {
        return r.json();
      }).then(function (res) {
        if (res && res.lead_id) {
          try { sessionStorage.setItem('grid-lead-id', res.lead_id); } catch (e) {}
        }
      }).catch(function () {});

      // Rastreamento de conversão de Lead
      if (window.fbq) {
        var paramsFbq = { content_name: dados.modelo_interesse || dados.troca_modelo || 'Lead Site' };
        if (dados.ref) { paramsFbq.content_ids = [dados.ref]; paramsFbq.content_type = 'vehicle'; }
        window.fbq('track', 'Lead', paramsFbq);
      }
      if (window.gtag) {
        window.gtag('event', 'generate_lead', {
          event_category: 'lead',
          event_label: dados.ref || dados.modelo_interesse || 'site'
        });
      }
    } catch (e) {}
  }

  function linkZap(msg, ref, depois) {
    var texto = msg + (ref ? ' [ref ' + ref + ' · ' + ORIGEM + ']' : ' [' + ORIGEM + ']') + (depois ? '\n' + depois : '');
    return 'https://wa.me/' + NUMERO + '?text=' + encodeURIComponent(texto);
  }
  // ---------- modal de contato e simulação (captura de lead com celular) ----------
  var abrirModalLead = null;
  (function () {
    var modal = document.getElementById('modal-simulacao');
    if (!modal) return;

    var btFechar = document.getElementById('modal-fechar');
    var form = document.getElementById('form-simulacao');
    var elTitulo = document.getElementById('sim-titulo');
    var elSub = document.getElementById('sim-sub');
    var elRef = document.getElementById('sim-ref');
    var elCarro = document.getElementById('sim-carro');
    var elPreco = document.getElementById('sim-preco');
    var elModo = document.getElementById('sim-modo');
    var elBlocoEntrada = document.getElementById('bloco-entrada');
    var elBtnTexto = document.getElementById('sim-btn-texto');
    var elNome = document.getElementById('sim-nome');
    var elTel = document.getElementById('sim-telefone');
    var elEntrada = document.getElementById('sim-entrada');
    var elErro = document.getElementById('sim-erro');

    var zapMsgAtual = '';

    function fechar() {
      modal.hidden = true;
      if (elErro) elErro.hidden = true;
      document.body.style.overflow = '';
    }

    abrirModalLead = function (config) {
      config = config || {};
      var modo = config.modo || 'contato';
      var carro = config.carro || '';
      var preco = config.preco || '';
      var ref = config.ref || '';
      zapMsgAtual = config.zapMsg || '';

      if (elCarro) elCarro.value = carro;
      if (elPreco) elPreco.value = preco;
      if (elRef) elRef.value = ref;
      if (elModo) elModo.value = modo;

      if (modo === 'simulacao') {
        if (elTitulo) elTitulo.textContent = 'Simular financiamento';
        if (elSub) elSub.textContent = 'Simulação para o ' + carro + (preco ? ' (' + preco + ')' : '');
        if (elBlocoEntrada) elBlocoEntrada.hidden = false;
        if (elBtnTexto) elBtnTexto.textContent = 'Simular no WhatsApp';
      } else {
        if (elTitulo) elTitulo.textContent = carro ? 'Falar com consultor' : 'Falar com a Grid';
        if (elSub) elSub.textContent = carro ? 'Atendimento para o ' + carro : 'Informe seu contato para abrir a conversa no WhatsApp.';
        if (elBlocoEntrada) elBlocoEntrada.hidden = true;
        if (elBtnTexto) elBtnTexto.textContent = 'Continuar para o WhatsApp';
      }

      try {
        if (elNome && !elNome.value) elNome.value = localStorage.getItem('grid_nome') || '';
        if (elTel && !elTel.value) elTel.value = localStorage.getItem('grid_tel') || '';
      } catch (_) {}

      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      if (elNome && !elNome.value) elNome.focus();
      else if (elTel && !elTel.value) elTel.focus();
      else if (modo === 'simulacao' && elEntrada) elEntrada.focus();
    };

    var btAbrirSim = document.getElementById('bt-abrir-simulacao');
    if (btAbrirSim) {
      btAbrirSim.addEventListener('click', function () {
        abrirModalLead({
          modo: 'simulacao',
          carro: btAbrirSim.getAttribute('data-carro'),
          preco: btAbrirSim.getAttribute('data-preco'),
          ref: btAbrirSim.getAttribute('data-ref')
        });
      });
    }

    if (btFechar) btFechar.addEventListener('click', fechar);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) fechar();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) fechar();
    });

    if (elTel) {
      elTel.addEventListener('input', function () {
        var d = elTel.value.replace(/\D/g, '').slice(0, 11);
        if (d.length > 10) elTel.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
        else if (d.length > 6) elTel.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
        else if (d.length > 2) elTel.value = '(' + d.slice(0, 2) + ') ' + d.slice(2);
        else if (d.length > 0) elTel.value = '(' + d;
      });
    }

    if (elEntrada) {
      elEntrada.addEventListener('input', function () {
        var d = elEntrada.value.replace(/\D/g, '').slice(0, 8);
        elEntrada.value = d ? 'R$ ' + Number(d).toLocaleString('pt-BR') : '';
      });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var nome = (elNome ? elNome.value : '').trim();
        var tel = (elTel ? elTel.value : '').trim();
        var dTel = tel.replace(/\D/g, '');
        var modo = (elModo ? elModo.value : 'contato');
        var entrada = (elEntrada ? elEntrada.value : '').trim();
        var carro = (elCarro ? elCarro.value : '').trim();
        var preco = (elPreco ? elPreco.value : '').trim();
        var ref = (elRef ? elRef.value : '').trim();

        if (!nome) {
          if (elErro) { elErro.textContent = 'Por favor, informe seu nome.'; elErro.hidden = false; }
          if (elNome) elNome.focus();
          return;
        }
        if (dTel.length < 10) {
          if (elErro) { elErro.textContent = 'Informe seu WhatsApp com DDD (mínimo 10 dígitos).'; elErro.hidden = false; }
          if (elTel) elTel.focus();
          return;
        }

        if (elErro) elErro.hidden = true;

        try {
          localStorage.setItem('grid_nome', nome);
          localStorage.setItem('grid_tel', tel);
        } catch (_) {}

        var textoZap = '';
        var condicao = '';
        if (modo === 'simulacao') {
          condicao = 'Financiamento';
          textoZap = 'Olá! Sou o ' + nome + '. Quero simular o financiamento do ' + carro + (preco ? ' (' + preco + ')' : '') + '.' + (entrada ? ' Valor de entrada pretendido: ' + entrada + '.' : '');
        } else if (zapMsgAtual) {
          textoZap = 'Olá! Sou o ' + nome + '. ' + zapMsgAtual;
        } else if (carro) {
          textoZap = 'Olá! Sou o ' + nome + '. Vi o ' + carro + ' no site da Grid.';
        } else {
          textoZap = 'Olá! Sou o ' + nome + '. Vim pelo site da Grid.';
        }

        var urlZap = linkZap(textoZap, ref);

        enviarLeadIntegrador({
          nome: nome,
          telefone: tel,
          ref: ref,
          modelo_interesse: carro,
          valor_proposta: entrada ? entrada.replace(/[^\d,]/g, '') : '',
          condicao_pagamento: condicao,
          mensagem: textoZap
        });

        fechar();
        window.open(urlZap, '_blank', 'noopener');
      });
    }
  })();

  function prepararZaps(raiz) {
    (raiz || document).querySelectorAll('a[data-zap]').forEach(function (a) {
      if (a.id === 'enviar-venda') return;
      a.href = linkZap(a.getAttribute('data-zap'), a.getAttribute('data-ref'), a.getAttribute('data-depois'));
      a.target = '_blank'; a.rel = 'noopener';
      if (!a.dataset.ouvindo) {
        a.dataset.ouvindo = '1';
        a.addEventListener('click', function (e) {
          if (abrirModalLead) {
            e.preventDefault();
            var h1 = document.querySelector('.layout-carro .h1');
            var nomeCarro = h1 ? h1.textContent.trim() : '';
            abrirModalLead({
              modo: 'contato',
              carro: nomeCarro,
              ref: a.getAttribute('data-ref') || '',
              zapMsg: a.getAttribute('data-zap') || ''
            });
          }
        });
      }
    });
    (raiz || document).querySelectorAll('[data-origem]').forEach(function (el) { el.textContent = ORIGEM; });
  }
  prepararZaps();

  // ---------- topo: carro do estoque trocando a cada 7 s ----------
  var hero = document.getElementById('hero-carro');
  if (hero) {
    var lista = [];
    try { lista = JSON.parse(hero.getAttribute('data-lista') || '[]'); } catch (e) {}
    var imgs = hero.querySelectorAll('.janela img');
    var barra = hero.querySelector('.hero-barra i');
    var leg = hero.querySelector('.hero-legenda');
    var calmo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var idx = 0, frente = 0, timer = null, pausado = false;
    function correBarra() { barra.classList.remove('corre'); void barra.offsetWidth; if (!calmo) barra.classList.add('corre'); }
    function precarrega(i) { var c = lista[i % lista.length]; if (c) { var im = new Image(); im.src = c.img; } }
    function mostra(i) {
      var c = lista[i]; if (!c) return;
      var tras = imgs[1 - frente];
      tras.src = c.img; tras.alt = c.alt; tras.removeAttribute('aria-hidden');
      var troca = function () {
        imgs[frente].classList.remove('ativa'); imgs[frente].setAttribute('aria-hidden', 'true'); imgs[frente].alt = '';
        tras.classList.add('ativa'); frente = 1 - frente;
        hero.href = c.href;
        leg.querySelector('b').textContent = c.nome;
        leg.querySelector('.ano').textContent = c.ano;
        leg.querySelector('.preco-h').textContent = c.preco;
        correBarra(); precarrega(i + 1);
      };
      if (tras.complete && tras.naturalWidth) troca(); else { tras.onload = troca; tras.onerror = function () { idx++; }; }
    }
    function proximo() { if (pausado || document.hidden || lista.length < 2) return; idx = (idx + 1) % lista.length; mostra(idx); }
    if (lista.length > 1 && !calmo) {
      correBarra(); precarrega(1);
      timer = setInterval(proximo, 7000);
      var reinicia = function () { clearInterval(timer); correBarra(); timer = setInterval(proximo, 7000); };
      hero.addEventListener('mouseenter', function () { pausado = true; barra.classList.remove('corre'); });
      hero.addEventListener('mouseleave', function () { pausado = false; reinicia(); });
      hero.addEventListener('focus', function () { pausado = true; });
      hero.addEventListener('blur', function () { pausado = false; });
    }
  }

  // ---------- vitrine: faixa de preço e ordem ----------
  var vitrine = document.getElementById('vitrine');
  if (vitrine) {
    var cards = Array.prototype.slice.call(vitrine.querySelectorAll('.card'));
    var vazio = document.getElementById('vazio');
    var estado = { faixa: 'todos', ordem: 'recentes' };
    var cabe = function (p) {
      return estado.faixa === 'todos' || (estado.faixa === 'ate80' && p <= 80000) ||
        (estado.faixa === '80a120' && p > 80000 && p <= 120000) || (estado.faixa === 'mais120' && p > 120000);
    };
    function aplicar() {
      var visiveis = 0;
      var ordenados = cards.slice().sort(function (a, b) {
        var pa = +a.dataset.preco, pb = +b.dataset.preco;
        if (estado.ordem === 'menor') return pa - pb;
        if (estado.ordem === 'maior') return pb - pa;
        return +a.dataset.ordem - +b.dataset.ordem;
      });
      ordenados.forEach(function (c) {
        var ok = cabe(+c.dataset.preco);
        c.hidden = !ok; if (ok) visiveis++;
        vitrine.appendChild(c);
      });
      vazio.hidden = visiveis > 0;
      vitrine.hidden = visiveis === 0;
    }
    document.querySelectorAll('[data-faixa]').forEach(function (b) {
      b.addEventListener('click', function () {
        estado.faixa = b.dataset.faixa;
        document.querySelectorAll('[data-faixa]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        aplicar();
      });
    });
    var ordem = document.getElementById('ordem');
    if (ordem) ordem.addEventListener('change', function () { estado.ordem = ordem.value; aplicar(); });
  }

  // ---------- galeria da página do carro ----------
  var trilho = document.getElementById('trilho');
  if (trilho) {
    var fotos = Array.prototype.slice.call(trilho.querySelectorAll('img'));
    var cont = document.getElementById('cont');
    var minis = Array.prototype.slice.call(document.querySelectorAll('#minis button'));
    var atual = function () { return Math.round(trilho.scrollLeft / trilho.clientWidth); };
    var ir = function (i) { trilho.scrollTo({ left: i * trilho.clientWidth, behavior: 'smooth' }); };
    trilho.addEventListener('scroll', function () {
      var i = atual();
      cont.textContent = (i + 1) + ' / ' + fotos.length;
      minis.forEach(function (b, k) { b.setAttribute('aria-current', String(k === i)); });
    }, { passive: true });
    document.querySelector('.seta.ant').addEventListener('click', function () { ir(Math.max(0, atual() - 1)); });
    document.querySelector('.seta.prox').addEventListener('click', function () { ir(Math.min(fotos.length - 1, atual() + 1)); });
    minis.forEach(function (b) { b.addEventListener('click', function () { ir(+b.dataset.i); }); });

    var tela = document.getElementById('tela');
    var zapCarro = document.querySelector('.zap-ficha');
    function abrirTela(i) {
      tela.innerHTML = '<div class="barra"><span id="tcont"></span><button type="button" class="fechar" id="tfechar">Fechar ✕</button></div>' +
        '<div class="trilho" id="ttrilho"></div><div class="rodape"></div>';
      var tt = tela.querySelector('#ttrilho');
      fotos.forEach(function (f) { var im = document.createElement('img'); im.src = f.currentSrc || f.src; im.alt = f.alt; tt.appendChild(im); });
      if (zapCarro) { var z = zapCarro.cloneNode(true); z.className = 'zap'; z.removeAttribute('data-ouvindo'); tela.querySelector('.rodape').appendChild(z); prepararZaps(tela); }
      tela.hidden = false; document.body.style.overflow = 'hidden';
      var tc = tela.querySelector('#tcont');
      var mostra = function () { tc.textContent = (Math.round(tt.scrollLeft / tt.clientWidth) + 1) + ' / ' + fotos.length; };
      tt.scrollLeft = i * tt.clientWidth; mostra();
      tt.addEventListener('scroll', mostra, { passive: true });
      var fechar = function () { tela.hidden = true; tela.innerHTML = ''; document.body.style.overflow = ''; document.removeEventListener('keydown', teclas); };
      var teclas = function (e) {
        if (e.key === 'Escape') fechar();
        if (e.key === 'ArrowRight') tt.scrollBy({ left: tt.clientWidth });
        if (e.key === 'ArrowLeft') tt.scrollBy({ left: -tt.clientWidth });
      };
      document.addEventListener('keydown', teclas);
      tela.querySelector('#tfechar').addEventListener('click', fechar);
      tela.querySelector('#tfechar').focus();
    }
    fotos.forEach(function (f, i) { f.addEventListener('click', function () { abrirTela(i); }); });
    document.getElementById('ampliar').addEventListener('click', function () { abrirTela(atual()); });
  }

  // ---------- enviar o carro para alguém ----------
  document.querySelectorAll('[data-compartilhar]').forEach(function (b) {
    b.addEventListener('click', function () {
      var titulo = b.getAttribute('data-titulo'), url = b.getAttribute('data-url');
      if (navigator.share) {
        navigator.share({ title: titulo, text: 'Olha esse carro na Grid: ' + titulo, url: url }).catch(function () {});
      } else {
        window.open('https://wa.me/?text=' + encodeURIComponent('Olha esse carro na Grid: ' + titulo + ' ' + url), '_blank', 'noopener');
      }
      if (window.fbq) window.fbq('trackCustom', 'Compartilhar');
      if (window.gtag) window.gtag('event', 'share', { method: 'whatsapp', content_type: 'vehicle' });
    });
  });

  // ---------- venda ou troca do carro do cliente ----------
  var venda = document.getElementById('venda');
  if (venda) {
    var dados = { intencao: '', sinais: [] };
    var passos = venda.querySelectorAll('.passo');
    var barraV = document.getElementById('barra');
    var atualV = 1;
    var interesses = [];
    try { interesses = JSON.parse(venda.getAttribute('data-interesses') || '[]'); } catch (e) {}
    var dl = document.getElementById('lista-interesses');
    interesses.forEach(function (c) { var o = document.createElement('option'); o.value = c.nome; dl.appendChild(o); });
    var q = new URLSearchParams(location.search);
    var trocaId = q.get('troca');
    var $ = function (id) { return document.getElementById(id); };
    function vai(n) {
      atualV = n;
      passos.forEach(function (p) { p.hidden = +p.getAttribute('data-passo') !== n; });
      barraV.style.width = (n * 25) + '%';
      if (n === 4) montaResumo();
      venda.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function rotulo(i) { return i === 'vender' ? 'Quero vender meu carro para a Grid.' : i === 'trocar' ? 'Quero trocar meu carro por um da Grid.' : 'Quero deixar meu carro em consignação na Grid.'; }
    function montaResumo() {
      var linhas = [];
      linhas.push('Olá' + ($('nome').value.trim() ? ', sou ' + $('nome').value.trim() : '') + '! ' + rotulo(dados.intencao));
      var carro = [$('marca').value, $('modelo').value, $('versao').value].map(function (s) { return s.trim(); }).filter(Boolean).join(' ');
      linhas.push('Meu carro: ' + carro + ' ' + $('ano').value + ($('cambio').value ? ', ' + $('cambio').value.toLowerCase() : '') + ', ' + $('km').value.trim() + ' km.');
      if (dados.sinais.length) linhas.push('Situação: ' + dados.sinais.join(', ') + '.');
      if ($('obs').value.trim()) linhas.push('Obs.: ' + $('obs').value.trim());
      if (dados.intencao === 'trocar' && $('interesse').value.trim()) linhas.push('Tenho interesse no ' + $('interesse').value.trim() + '.');
      var texto = linhas.join('\n');
      $('resumo').textContent = texto;
      var a = $('enviar-venda');
      a.setAttribute('data-zap', texto);
      var ref = '';
      if (dados.intencao === 'trocar' && trocaId) ref = trocaId;
      if (ref) a.setAttribute('data-ref', ref); else a.removeAttribute('data-ref');
      a.removeAttribute('data-ouvindo');
      prepararZaps(a.parentNode);
    }
    venda.querySelectorAll('.opcao').forEach(function (b) {
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
      b.addEventListener('click', function () {
        dados.intencao = b.getAttribute('data-valor');
        venda.querySelectorAll('.opcao').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
        venda.querySelector('.so-troca').hidden = dados.intencao !== 'trocar';
        setTimeout(function () { vai(2); }, 180);
      });
    });
    venda.querySelectorAll('.marca').forEach(function (b) {
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', String(on));
        var s = b.getAttribute('data-sinal');
        dados.sinais = dados.sinais.filter(function (x) { return x !== s; });
        if (on) dados.sinais.push(s);
      });
    });
    venda.querySelectorAll('.voltar-passo').forEach(function (b) { b.addEventListener('click', function () { vai(Math.max(1, atualV - 1)); }); });
    venda.querySelectorAll('.avancar').forEach(function (b) {
      b.addEventListener('click', function () {
        if (atualV === 2) {
          var ok = $('marca').value.trim() && $('modelo').value.trim() && $('ano').value && $('km').value.trim();
          $('erro2').hidden = !!ok; if (!ok) return;
        }
        vai(atualV + 1);
      });
    });
    try {
      if ($('nome') && !$('nome').value && localStorage.getItem('grid_nome')) $('nome').value = localStorage.getItem('grid_nome');
      if ($('telefone') && !$('telefone').value && localStorage.getItem('grid_tel')) $('telefone').value = localStorage.getItem('grid_tel');
    } catch (_) {}
    ['nome', 'interesse', 'telefone'].forEach(function (id) { var el = $(id); if (el) el.addEventListener('input', montaResumo); });
    if ($('telefone')) {
      $('telefone').addEventListener('input', function () {
        var d = $('telefone').value.replace(/\D/g, '').slice(0, 11);
        if (d.length > 10) $('telefone').value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
        else if (d.length > 6) $('telefone').value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
        else if (d.length > 2) $('telefone').value = '(' + d.slice(0, 2) + ') ' + d.slice(2);
        else if (d.length > 0) $('telefone').value = '(' + d;
      });
    }
    var btEnviarVenda = $('enviar-venda');
    if (btEnviarVenda) {
      btEnviarVenda.addEventListener('click', function (e) {
        var nomeCli = $('nome').value.trim();
        var telCli = $('telefone') ? $('telefone').value.trim() : '';
        var numLimpo = telCli.replace(/\D/g, '');
        if (numLimpo.length < 10) {
          e.preventDefault();
          alert('Por favor, informe seu WhatsApp com DDD para retorno da avaliação.');
          if ($('telefone')) $('telefone').focus();
          return;
        }

        try {
          if (nomeCli) localStorage.setItem('grid_nome', nomeCli);
          if (telCli) localStorage.setItem('grid_tel', telCli);
        } catch (_) {}

        var carroCli = [$('marca').value, $('modelo').value, $('versao').value, $('ano').value, ($('cambio').value || ''), ($('km').value ? $('km').value.trim() + ' km' : '')]
          .map(function (s) { return (s || '').trim(); }).filter(Boolean).join(' ');
        var notasCli = [];
        if (dados.sinais && dados.sinais.length) notasCli.push('Situação: ' + dados.sinais.join(', '));
        if ($('obs').value.trim()) notasCli.push('Obs.: ' + $('obs').value.trim());

        enviarLeadIntegrador({
          nome: nomeCli || 'Visitante (Venda/Troca)',
          telefone: telCli,
          ref: (dados.intencao === 'trocar' && trocaId) ? trocaId : '',
          modelo_interesse: (dados.intencao === 'trocar' && $('interesse').value.trim()) ? $('interesse').value.trim() : '',
          troca_modelo: carroCli,
          condicao_pagamento: dados.intencao === 'trocar' ? 'Troca' : 'Venda',
          mensagem: $('resumo').textContent || '',
          notas: notasCli.join('\n')
        });
      });
    }
    $('km').addEventListener('input', function () {
      var d = $('km').value.replace(/\D/g, '').slice(0, 7);
      $('km').value = d ? Number(d).toLocaleString('pt-BR') : '';
    });
    $('form-venda').addEventListener('submit', function (e) { e.preventDefault(); });
    if (trocaId) {
      var c = interesses.find(function (x) { return String(x.id) === trocaId; });
      var bt = venda.querySelector('.opcao[data-valor="trocar"]');
      if (c) $('interesse').value = c.nome;
      if (bt) bt.click();
    }
  }

  // ---------- autorama do rodapé ----------
  // A pista é desenhada no tamanho da caixa: deitada no computador, em pé no celular.
  // Carro amarelo = visitante (segura para acelerar). Carro branco = adversário automático.
  // Na curva, o limite de velocidade segue a física: v = raiz(aceleração lateral × raio).
  (function () {
    var caixa = document.getElementById('autorama');
    if (!caixa || !window.requestAnimationFrame) return;
    var svg = caixa.querySelector('.pista'), botao = caixa.querySelector('.acelerar');
    var barra = caixa.querySelector('.velo i'), aviso = caixa.querySelector('[data-aviso]');
    var elVolta = caixa.querySelector('[data-volta]'), elMelhor = caixa.querySelector('[data-melhor]');
    var NS = 'http://www.w3.org/2000/svg';
    var LARG = 44, FAIXA = 11, ACEL_LATERAL = 1000, VMAX = 640;
    var reduzir = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var g = null, ext, int, eu, rival, LE = 1, LI = 1, limEu = 0, limRival = 0;
    var s = 0, v = 0, sr = 0, apertado = false, fora = null, entradaCurva = 0, naCurva = false;
    var inicioVolta = null, melhor = null, visivel = true, ultimo = null;

    function el(nome, attrs, pai) {
      var e = document.createElementNS(NS, nome);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (pai) pai.appendChild(e);
      return e;
    }
    function estadio(W, H, recuo) {
      var x = recuo, y = recuo, w = W - 2 * recuo, h = H - 2 * recuo;
      if (w >= h) {
        var r = h / 2;
        return { r: r, d: 'M' + (x + w / 2) + ',' + (y + h) + ' H' + (x + w - r) + ' A' + r + ' ' + r + ' 0 0 0 ' + (x + w - r) + ',' + y +
          ' H' + (x + r) + ' A' + r + ' ' + r + ' 0 0 0 ' + (x + r) + ',' + (y + h) + ' Z',
          curvas: 'M' + (x + w - r) + ',' + (y + h) + ' A' + r + ' ' + r + ' 0 0 0 ' + (x + w - r) + ',' + y +
          ' M' + (x + r) + ',' + y + ' A' + r + ' ' + r + ' 0 0 0 ' + (x + r) + ',' + (y + h) };
      }
      var R = w / 2;
      return { r: R, d: 'M' + (x + w) + ',' + (y + h / 2) + ' V' + (y + R) + ' A' + R + ' ' + R + ' 0 0 0 ' + x + ',' + (y + R) +
        ' V' + (y + h - R) + ' A' + R + ' ' + R + ' 0 0 0 ' + (x + w) + ',' + (y + h - R) + ' Z',
        curvas: 'M' + (x + w) + ',' + (y + R) + ' A' + R + ' ' + R + ' 0 0 0 ' + x + ',' + (y + R) +
        ' M' + x + ',' + (y + h - R) + ' A' + R + ' ' + R + ' 0 0 0 ' + (x + w) + ',' + (y + h - R) };
    }
    function carro(cor, pai) {
      var c = el('g', { style: 'color:' + cor }, pai), k = el('g', { transform: 'scale(1.1)' }, c);
      [[-15, -7, 3.5, 14, '#0c0c0e'], [-10, -8.6, 6, 3, '#0c0c0e'], [-10, 5.6, 6, 3, '#0c0c0e'], [5, -8, 5, 2.6, '#0c0c0e'], [5, 5.4, 5, 2.6, '#0c0c0e'],
       [-13, -4, 25, 8, 'currentColor', 3.5], [-7, -5.6, 10, 11.2, 'currentColor', 2.5], [11, -6.5, 3, 13, 'currentColor']].forEach(function (p) {
        el('rect', { x: p[0], y: p[1], width: p[2], height: p[3], rx: p[5] || 1, fill: p[4] }, k);
      });
      el('ellipse', { cx: -1, cy: 0, rx: 3, ry: 2.2, fill: '#0c0c0e' }, k);
      return c;
    }
    var W = 0, H = 0, deitada = true;
    function montar() {
      var nW = caixa.clientWidth, nH = caixa.clientHeight;
      if (!nW || !nH || (nW === W && nH === H)) return;
      var fracEu = s / LE, fracRival = sr / LI;
      W = nW; H = nH; deitada = W >= H;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      g = el('g', {}, svg);
      var m = LARG / 2 + 6, meio = estadio(W, H, m);
      var defs = el('defs', {}, g), pat = el('pattern', { id: 'xadrez-pista', width: 6, height: 6, patternUnits: 'userSpaceOnUse' }, defs);
      el('rect', { width: 6, height: 6, fill: '#f3f2ed' }, pat); el('rect', { width: 3, height: 3, fill: '#121214' }, pat); el('rect', { x: 3, y: 3, width: 3, height: 3, fill: '#121214' }, pat);
      el('path', { d: meio.d, fill: 'none', stroke: '#26262b', 'stroke-width': LARG, 'class': 'toque' }, g);
      var zebra = estadio(W, H, m - LARG / 2 - 2).curvas;
      el('path', { d: zebra, fill: 'none', stroke: '#121214', 'stroke-width': 4 }, g);
      el('path', { d: zebra, fill: 'none', stroke: '#f2c200', 'stroke-width': 4, 'stroke-dasharray': '7 7' }, g);
      el('path', { d: estadio(W, H, m - LARG / 2).d, fill: 'none', stroke: '#3a3a41', 'stroke-width': 1 }, g);
      el('path', { d: estadio(W, H, m + LARG / 2).d, fill: 'none', stroke: '#3a3a41', 'stroke-width': 1 }, g);
      var e = estadio(W, H, m - FAIXA), i = estadio(W, H, m + FAIXA);
      ext = el('path', { d: e.d, fill: 'none', stroke: '#0c0c0e', 'stroke-width': 2.2 }, g);
      int = el('path', { d: i.d, fill: 'none', stroke: '#0c0c0e', 'stroke-width': 2.2 }, g);
      if (deitada) el('rect', { x: W / 2 - 6, y: H - m - LARG / 2, width: 12, height: LARG, fill: 'url(#xadrez-pista)' }, g);
      else el('rect', { x: W - m - LARG / 2, y: H / 2 - 6, width: LARG, height: 12, fill: 'url(#xadrez-pista)' }, g);
      LE = ext.getTotalLength(); LI = int.getTotalLength();
      limEu = Math.sqrt(ACEL_LATERAL * e.r); limRival = Math.sqrt(ACEL_LATERAL * i.r) * 0.86;
      rival = carro('#f3f2ed', g); eu = carro('#f2c200', g);
      s = (fracEu || 0) * LE; sr = (isFinite(fracRival) && fracRival ? fracRival : 0.5) * LI;
      por(eu, pos(ext, s, LE)); por(rival, pos(int, sr, LI));
      svg.querySelector('.toque').addEventListener('pointerdown', apertar);
    }
    function pos(c, x, L) {
      x = ((x % L) + L) % L;
      var a = c.getPointAtLength(x), b = c.getPointAtLength((x + 1) % L);
      return { x: a.x, y: a.y, ang: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };
    }
    function por(c, p) { c.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + p.ang.toFixed(1) + ')'); }
    function emCurva(p) { return deitada ? (p.x < H / 2 - 1 || p.x > W - H / 2 + 1) : (p.y < W / 2 - 1 || p.y > H - W / 2 + 1); }
    function seg(ms) { return (ms / 1000).toFixed(2).replace('.', ',') + 's'; }
    function apertar(e) { if (e) e.preventDefault(); apertado = true; botao.classList.add('on'); }
    function soltar() { apertado = false; botao.classList.remove('on'); }

    botao.addEventListener('pointerdown', apertar);
    botao.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') apertar(e); });
    botao.addEventListener('keyup', soltar);
    botao.addEventListener('blur', soltar);
    botao.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; }).observe(caixa);
    if ('ResizeObserver' in window) new ResizeObserver(montar).observe(caixa); else window.addEventListener('resize', montar);
    montar();

    function passo(t) {
      var dt = ultimo == null ? 0 : Math.min(0.05, (t - ultimo) / 1000); ultimo = t;
      if (visivel && g) {
        if (!reduzir) { var pr = pos(int, sr, LI); sr = (sr + (emCurva(pr) ? limRival : 430) * dt) % LI; por(rival, pos(int, sr, LI)); }
        if (fora) {
          fora.t += dt; fora.vel *= 0.94; fora.giro += 540 * dt;
          fora.x += Math.cos(fora.dir) * fora.vel * dt; fora.y += Math.sin(fora.dir) * fora.vel * dt;
          eu.setAttribute('transform', 'translate(' + fora.x.toFixed(1) + ' ' + fora.y.toFixed(1) + ') rotate(' + (fora.ang + fora.giro).toFixed(1) + ')');
          eu.style.opacity = Math.max(0, 1 - fora.t / 0.9);
          if (fora.t > 1.1) { s = entradaCurva; v = 0; fora = null; eu.style.opacity = 1; inicioVolta = null; aviso.textContent = 'De volta à pista. Alivie antes da curva.'; aviso.className = 'aviso-pista'; }
        } else {
          v = Math.max(0, Math.min(VMAX, v + (apertado ? 540 : -380) * dt));
          var antes = s; s += v * dt;
          if (s >= LE) {
            s -= LE; var agora = performance.now();
            if (inicioVolta != null) { var tv = agora - inicioVolta; elVolta.textContent = seg(tv); if (melhor == null || tv < melhor) { melhor = tv; elMelhor.textContent = seg(tv); } }
            inicioVolta = agora;
          }
          var p = pos(ext, s, LE), curva = emCurva(p);
          if (curva && !naCurva) entradaCurva = antes;
          naCurva = curva;
          if (curva && v > limEu) {
            fora = { x: p.x, y: p.y, ang: p.ang, dir: p.ang * Math.PI / 180, vel: v, giro: 0, t: 0 };
            aviso.textContent = 'Saiu da pista! Rápido demais na curva.'; aviso.className = 'aviso-pista forte';
          } else por(eu, p);
        }
        barra.style.width = (v / VMAX * 100).toFixed(0) + '%';
        barra.className = v > limEu ? 'perigo' : '';
      }
      requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  })();

  // ---------- aviso de cookies (só com o pixel ligado) ----------
  if (document.body.getAttribute('data-pixel') === '1') {
    var visto = null;
    try { visto = localStorage.getItem('grid-cookies'); } catch (e) {}
    var aviso = document.getElementById('cookies');
    if (aviso && !visto) {
      aviso.hidden = false;
      aviso.querySelector('button').addEventListener('click', function () {
        aviso.hidden = true;
        try { localStorage.setItem('grid-cookies', '1'); } catch (e) {}
      });
    }
  }
})();
