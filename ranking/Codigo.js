/**
 * Ranking do autorama do site da Grid (www.gridbh.com) — Apps Script SEPARADO do Integrador.
 * Planilha ligada a este script: aba "Voltas" (data, apelido, ms). Para tirar alguém do ranking, apague a linha.
 *
 * Rota pública (o site chama sem senha), então:
 *  - só aceita apelido (2 a 16 letras/números) e um tempo de volta; nada pessoal;
 *  - recusa tempo impossível: a volta mais rápida que a física do jogo permite é ~4,6 s (pista de referência);
 *  - limita o tamanho do pedido e a quantidade de envios por minuto;
 *  - nunca apaga nem altera linhas: só acrescenta.
 */
var ABA = 'Voltas', VERSAO = 2;
// Duas pistas (09/11): computador (pc, volta mínima ~4,6 s) e celular (cel, ~3,7 s). Linha antiga sem pista = pc.
var MIN_MS = { pc: 4500, cel: 3600 }, MAX_MS = 120000, TOP = 10;
var PROIBIDAS = ['porra', 'caralho', 'puta', 'merda', 'buceta', 'cu', 'viado', 'fdp', 'pqp', 'cacete', 'bosta', 'piroca', 'rola', 'xoxota', 'arrombado', 'corno']; // palavra inteira

function doGet(e) {
  var acao = e && e.parameter && e.parameter.acao;
  if (acao === 'top') return json_({ ok: true, versao: VERSAO, top: top_(pista_(e.parameter.pista)) });
  return json_({ ok: true, servico: 'ranking-autorama', versao: VERSAO });
}

function doPost(e) {
  try {
    var corpo = (e && e.postData && e.postData.contents) || '';
    if (corpo.length > 300) return json_({ ok: false, erro: 'Pedido grande demais.' });
    var d = JSON.parse(corpo);
    if (d.acao !== 'salvar') return json_({ ok: false, erro: 'Ação desconhecida.' });
    var apelido = String(d.apelido || '').replace(/\s+/g, ' ').trim();
    var ms = Math.round(Number(d.ms)), pista = pista_(d.pista);
    if (apelido.length < 2 || apelido.length > 16 || !/^[\p{L}\p{N} ._-]+$/u.test(apelido)) return json_({ ok: false, erro: 'Apelido: de 2 a 16 letras ou números.' });
    var palavras = apelido.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[ ._-]+/);
    if (palavras.some(function (p) { return PROIBIDAS.indexOf(p) >= 0; })) return json_({ ok: false, erro: 'Escolha outro apelido.' });
    if (!isFinite(ms) || ms < MIN_MS[pista] || ms > MAX_MS) return json_({ ok: false, erro: 'Tempo fora do possível.' });

    var cache = CacheService.getScriptCache();
    var porMin = Number(cache.get('envios') || 0);
    if (porMin >= 30) return json_({ ok: false, erro: 'Muitos envios agora. Tente em um minuto.' });
    var chaveAp = 'ap_' + pista + '_' + apelido.toLowerCase();
    if (cache.get(chaveAp)) return json_({ ok: false, erro: 'Espere alguns segundos para salvar de novo.' });

    var lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      aba_().appendRow([new Date(), apelido, ms, pista]);
      cache.put('envios', String(porMin + 1), 60);
      cache.put(chaveAp, '1', 10);
      cache.remove('top_' + pista);
    } finally { lock.releaseLock(); }
    return json_({ ok: true, versao: VERSAO, top: top_(pista) });
  } catch (err) {
    return json_({ ok: false, erro: 'Não consegui salvar agora.' });
  }
}

function pista_(p) { return p === 'cel' ? 'cel' : 'pc'; }

function top_(pista) {
  pista = pista_(pista);
  var cache = CacheService.getScriptCache();
  var c = cache.get('top_' + pista);
  if (c) return JSON.parse(c);
  var linhas = aba_().getDataRange().getValues().slice(1);
  var melhor = {};
  linhas.forEach(function (l) {
    var ap = String(l[1] || '').trim(), ms = Number(l[2]), p = pista_(l[3]);
    if (p !== pista || !ap || !isFinite(ms) || ms < MIN_MS[p] || ms > MAX_MS) return;
    var k = ap.toLowerCase();
    if (!melhor[k] || ms < melhor[k].ms) melhor[k] = { apelido: ap, ms: ms };
  });
  var lista = Object.keys(melhor).map(function (k) { return melhor[k]; }).sort(function (a, b) { return a.ms - b.ms; }).slice(0, TOP);
  cache.put('top_' + pista, JSON.stringify(lista), 60);
  return lista;
}

function aba_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var a = ss.getSheetByName(ABA);
  if (!a) { a = ss.insertSheet(ABA); a.appendRow(['data', 'apelido', 'ms', 'pista']); a.setFrozenRows(1); }
  else if (a.getRange(1, 4).getValue() !== 'pista') a.getRange(1, 4).setValue('pista');
  return a;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Rodar UMA vez no editor (botão Executar) para o Google pedir a permissão da planilha. */
function autorizar() { aba_(); Logger.log('ok: aba ' + ABA + ' pronta. Top pc: ' + JSON.stringify(top_('pc')) + ' · cel: ' + JSON.stringify(top_('cel'))); }
