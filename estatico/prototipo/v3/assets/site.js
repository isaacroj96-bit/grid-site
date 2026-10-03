/* Grid Automóveis — comportamento do site (sem bibliotecas). */
(function () {
  'use strict';
  var NUMERO = document.body.getAttribute('data-whatsapp');

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

  function linkZap(msg, ref) {
    var texto = msg + (ref ? ' [ref ' + ref + ' · ' + ORIGEM + ']' : ' [' + ORIGEM + ']');
    return 'https://wa.me/' + NUMERO + '?text=' + encodeURIComponent(texto);
  }
  function prepararZaps(raiz) {
    (raiz || document).querySelectorAll('a[data-zap]').forEach(function (a) {
      a.href = linkZap(a.getAttribute('data-zap'), a.getAttribute('data-ref'));
      a.target = '_blank'; a.rel = 'noopener';
      if (!a.dataset.ouvindo) {
        a.dataset.ouvindo = '1';
        a.addEventListener('click', function () {
          if (window.fbq) window.fbq('track', 'Contact', a.getAttribute('data-ref') ? { content_ids: [a.getAttribute('data-ref')], content_type: 'vehicle' } : {});
        });
      }
    });
    (raiz || document).querySelectorAll('[data-origem]').forEach(function (el) { el.textContent = ORIGEM; });
  }
  prepararZaps();

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
