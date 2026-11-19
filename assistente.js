/* Iceman AI - assistente incorporabile per siti di piccole aziende. Nessuna libreria.
 * Uso (una riga):
 *   <script src="https://icemanai.it/assistente.js" data-cliente="demo-bb" defer></script>
 * Opzioni: data-api = indirizzo base del servizio (es. https://xxxx.trycloudflare.com); se manca si legge chat-endpoint.json
 * accanto a questo script (stesso file usato da carrello e chat del sito). data-privacy = pagina privacy del cliente.
 * Il widget vive in uno Shadow DOM: non cambia la grafica del sito che lo ospita. */
(function () {
  'use strict';
  var d = document;
  var script = d.currentScript;
  if (!script) { var tutti = d.querySelectorAll('script[data-cliente]'); script = tutti[tutti.length - 1]; }
  if (!script) return;
  var cliente = String(script.getAttribute('data-cliente') || '');
  if (!/^[A-Za-z0-9-]{1,40}$/.test(cliente)) return;
  if (d.getElementById('icemanai-assistente')) return;
  var baseScript = script.src || location.href;
  var privacyUrl = script.getAttribute('data-privacy') || (function () { try { return new URL('privacy.html', baseScript).href; } catch (e) { return '#'; } })();
  var MAX_MSG = 1000;
  var CH = 'icemanai-assistente-' + cliente;

  /* ---------- indirizzo del servizio ---------- */
  function normalizza(u) {
    u = String(u || '').trim().replace(/\/+$/, '');
    if (!u) return '';
    u = u.replace(/\/api\/sito-chat$/, '').replace(/\/api\/assistente(\/chat)?$/, '');
    return u + '/api/assistente';
  }
  var cacheApi = null;
  function urlApi() {
    if (cacheApi) return Promise.resolve(cacheApi);
    var fisso = normalizza(script.getAttribute('data-api'));
    if (fisso) { cacheApi = fisso; return Promise.resolve(fisso); }
    var ep; try { ep = new URL('chat-endpoint.json', baseScript).href; } catch (e) { ep = 'chat-endpoint.json'; }
    return fetch(ep + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) { cacheApi = normalizza(j && j.url); return cacheApi; })
      .catch(function () { return ''; });
  }

  /* ---------- sessione e cronologia (sessionStorage) ---------- */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); (window.crypto || window.msCrypto).getRandomValues(b);
    var h = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  var stato = { sess: '', storia: [], ok: false };
  try {
    var raw = JSON.parse(sessionStorage.getItem(CH) || 'null');
    if (raw && typeof raw.sess === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(raw.sess) && Array.isArray(raw.storia)) {
      stato.sess = raw.sess; stato.ok = raw.ok === true;
      stato.storia = raw.storia.filter(function (m) { return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'; }).slice(-30);
    }
  } catch (e) { /* ignora */ }
  if (!stato.sess) stato.sess = uuid();
  function salva() { try { sessionStorage.setItem(CH, JSON.stringify({ sess: stato.sess, ok: stato.ok, storia: stato.storia.slice(-30) })); } catch (e) { /* ignora */ } }

  /* ---------- interfaccia ---------- */
  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box}',
    '.fab,.pan{font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#e8f1ff}',
    '.fab{position:fixed;right:18px;bottom:18px;z-index:2147483000;width:60px;height:60px;border-radius:50%;border:1px solid #3de0ff;background:linear-gradient(135deg,#2b7bff,#1aa9e8);color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 0 22px rgba(61,224,255,.5),0 6px 20px rgba(0,0,0,.45)}',
    '.fab:hover{box-shadow:0 0 32px rgba(61,224,255,.8),0 6px 20px rgba(0,0,0,.45)}',
    ':focus-visible{outline:3px solid #fff;outline-offset:2px;box-shadow:0 0 0 6px rgba(61,224,255,.55)}',
    '.pan{position:fixed;right:18px;bottom:90px;z-index:2147483001;width:min(390px,100vw - 36px);height:min(620px,100vh - 110px);display:flex;flex-direction:column;background:#060f24;border:1px solid #3de0ff;border-radius:18px;box-shadow:0 0 30px rgba(61,224,255,.3),0 12px 40px rgba(0,0,0,.6);overflow:hidden}',
    '.pan[hidden]{display:none}',
    '.top{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 12px 10px 16px;border-bottom:1px solid rgba(61,224,255,.28);background:#08142b}',
    '.top strong{font-size:1rem;color:#fff}',
    '.x{background:none;border:1px solid rgba(61,224,255,.4);color:#fff;border-radius:10px;width:44px;height:44px;font-size:1.6rem;line-height:1;cursor:pointer}',
    '.nota{margin:0;padding:8px 16px;font-size:.82rem;color:#a9bcdb;border-bottom:1px solid rgba(61,224,255,.18)}',
    '.demo{margin:0;padding:8px 16px;font-size:.85rem;color:#1b1300;background:#ffc857;font-weight:600}',
    '.msgs{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}',
    '.b{margin:0;padding:10px 14px;border-radius:14px 14px 14px 4px;background:rgba(61,224,255,.12);border:1px solid rgba(61,224,255,.28);font-size:.97rem;line-height:1.5;max-width:92%;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.b.mia{align-self:flex-end;border-radius:14px 14px 4px 14px;background:rgba(43,123,255,.32)}',
    '.b.pensa{opacity:.75;font-style:italic}',
    '.lead{margin:0 14px 10px;padding:12px;border:1px solid #ffc857;border-radius:12px;background:rgba(255,200,87,.1);font-size:.92rem}',
    '.lead[hidden]{display:none}',
    '.lead p{margin:0 0 8px}',
    '.lead ul{margin:0 0 8px;padding-left:1.1em;color:#cfe0ff}',
    '.lead label,.ok{display:flex;gap:10px;align-items:flex-start;font-size:.86rem;color:#e8f1ff;margin:6px 0}',
    '.lead input[type=checkbox],.ok input{width:22px;height:22px;flex:none;margin:1px 0 0;accent-color:#3de0ff}',
    '.riga{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}',
    'button.bt{min-height:44px;padding:8px 16px;border-radius:12px;border:1px solid #3de0ff;background:rgba(61,224,255,.1);color:#fff;font:inherit;font-weight:700;cursor:pointer}',
    'button.bt.pri{background:linear-gradient(135deg,#2b7bff,#1aa9e8);border-color:transparent}',
    'button.bt:disabled{opacity:.55;cursor:not-allowed}',
    'form{padding:0 14px 8px;display:flex;flex-direction:column;gap:4px;border-top:1px solid rgba(61,224,255,.18)}',
    '.rg{display:flex;gap:8px;align-items:flex-end;margin-top:6px}',
    'textarea{flex:1;min-height:48px;max-height:120px;resize:none;font:inherit;font-size:16px;color:#fff;background:#0a1530;border:1px solid rgba(61,224,255,.4);border-radius:10px;padding:10px 12px}',
    '.err{margin:0;min-height:1.2em;color:#ffb4a8;font-size:.88rem}',
    '.pie{display:flex;gap:14px;flex-wrap:wrap;justify-content:space-between;padding:6px 16px 12px;font-size:.82rem}',
    '.pie a{color:#3de0ff;min-height:24px}',
    '@media(max-width:600px){.pan{inset:0;width:auto;height:auto;border-radius:0;border:0}.fab{right:14px;bottom:14px}}',
    '@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}',
    '@media(forced-colors:active){.fab,.pan,.b,.bt{border:1px solid CanvasText}}'
  ].join('');

  var host = d.createElement('div');
  host.id = 'icemanai-assistente';
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  var cfg = { nome: 'Assistente', benvenuto: 'Ciao, sono un assistente automatico. Chiedimi pure.', demo: false, avviso_demo: '', email: '', whatsapp: '' };

  function el(tag, cls, testo) { var e = d.createElement(tag); if (cls) e.className = cls; if (testo !== undefined) e.textContent = testo; return e; }
  var st = d.createElement('style'); st.textContent = CSS; root.appendChild(st);

  var fab = el('button', 'fab'); fab.type = 'button';
  fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'pan');
  fab.innerHTML = '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path d="M5 6h22v16H14l-6 5v-5H5z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="11" cy="14" r="1.6" fill="currentColor"/><circle cx="16" cy="14" r="1.6" fill="currentColor"/><circle cx="21" cy="14" r="1.6" fill="currentColor"/></svg>';

  var pan = el('section', 'pan'); pan.id = 'pan'; pan.setAttribute('role', 'dialog'); pan.hidden = true;
  var top = el('div', 'top'); var titolo = el('strong', '', cfg.nome);
  var chiudi = el('button', 'x', '×'); chiudi.type = 'button'; chiudi.setAttribute('aria-label', 'Chiudi la chat');
  top.appendChild(titolo); top.appendChild(chiudi);
  var demo = el('p', 'demo'); demo.hidden = true;
  var nota = el('p', 'nota', 'Assistente automatico. Le risposte possono contenere errori: per conferme scrivi al titolare.');
  var msgs = el('div', 'msgs'); msgs.setAttribute('role', 'log'); msgs.setAttribute('aria-live', 'polite'); msgs.setAttribute('aria-label', 'Conversazione');

  var lead = el('div', 'lead'); lead.hidden = true; lead.setAttribute('role', 'group'); lead.setAttribute('aria-label', 'Consenso per inviare la richiesta al titolare');
  var leadTesto = el('p'); var leadElenco = el('ul');
  var leadLabel = el('label'); var leadCk = d.createElement('input'); leadCk.type = 'checkbox'; leadCk.id = 'lead-ck';
  var leadSpan = el('span'); leadSpan.appendChild(d.createTextNode('Acconsento al trattamento dei miei dati (nome, contatto, richiesta) per essere ricontattato. Informativa: '));
  var leadPriv = el('a', '', 'privacy'); leadPriv.href = privacyUrl; leadPriv.target = '_blank'; leadPriv.rel = 'noopener';
  leadSpan.appendChild(leadPriv); leadLabel.appendChild(leadCk); leadLabel.appendChild(leadSpan);
  var leadRiga = el('div', 'riga'); var leadSi = el('button', 'bt pri', 'Invia al titolare'); leadSi.type = 'button'; leadSi.disabled = true;
  var leadNo = el('button', 'bt', 'No, grazie'); leadNo.type = 'button';
  leadRiga.appendChild(leadSi); leadRiga.appendChild(leadNo);
  lead.appendChild(leadTesto); lead.appendChild(leadElenco); lead.appendChild(leadLabel); lead.appendChild(leadRiga);

  var f = el('form'); f.noValidate = true;
  var okL = el('label', 'ok'); var ok = d.createElement('input'); ok.type = 'checkbox'; ok.id = 'ok-priv';
  var okS = el('span'); okS.appendChild(d.createTextNode('Ho letto l’'));
  var okA = el('a', '', 'informativa privacy'); okA.href = privacyUrl; okA.target = '_blank'; okA.rel = 'noopener';
  okS.appendChild(okA); okS.appendChild(d.createTextNode(' e accetto l’uso della chat assistita da un sistema automatico'));
  okL.appendChild(ok); okL.appendChild(okS);
  var rg = el('div', 'rg'); var txt = d.createElement('textarea'); txt.rows = 2; txt.maxLength = MAX_MSG; txt.placeholder = 'Scrivi qui…'; txt.setAttribute('aria-label', 'Il tuo messaggio');
  var inv = el('button', 'bt pri', 'Invia'); inv.type = 'submit';
  rg.appendChild(txt); rg.appendChild(inv);
  var err = el('p', 'err'); err.setAttribute('role', 'alert');
  f.appendChild(okL); f.appendChild(rg); f.appendChild(err);
  var pie = el('div', 'pie');
  var umano = el('a', '', 'Parla con il titolare'); umano.hidden = true; umano.rel = 'noopener';
  var privPie = el('a', '', 'Privacy'); privPie.href = privacyUrl; privPie.target = '_blank'; privPie.rel = 'noopener';
  pie.appendChild(umano); pie.appendChild(privPie);

  pan.appendChild(top); pan.appendChild(demo); pan.appendChild(nota); pan.appendChild(msgs); pan.appendChild(lead); pan.appendChild(f); pan.appendChild(pie);
  root.appendChild(fab); root.appendChild(pan);
  ok.checked = stato.ok;

  function bolla(t, mia, pensa) {
    var b = el('p', 'b' + (mia ? ' mia' : '') + (pensa ? ' pensa' : ''), t);
    msgs.appendChild(b); msgs.scrollTop = msgs.scrollHeight; return b;
  }
  function disegnaStoria() {
    msgs.textContent = '';
    bolla(cfg.benvenuto, false);
    for (var i = 0; i < stato.storia.length; i++) bolla(stato.storia[i].content, stato.storia[i].role === 'user');
  }
  function applicaConfig() {
    titolo.textContent = cfg.nome;
    pan.setAttribute('aria-label', 'Chat con l’assistente di ' + cfg.nome);
    fab.setAttribute('aria-label', 'Apri la chat con l’assistente di ' + cfg.nome);
    if (cfg.demo) { demo.hidden = false; demo.textContent = cfg.avviso_demo || 'Demo: struttura inventata.'; }
    if (cfg.whatsapp) { umano.href = 'https://wa.me/' + cfg.whatsapp; umano.hidden = false; umano.target = '_blank'; }
    else if (cfg.email && /^[^\s@<>"]+@[^\s@<>"]+$/.test(cfg.email)) { umano.href = 'mailto:' + cfg.email; umano.hidden = false; }
    disegnaStoria();
  }
  disegnaStoria(); pan.setAttribute('aria-label', 'Chat con l’assistente'); fab.setAttribute('aria-label', 'Apri la chat con l’assistente');

  /* ---------- apertura e chiusura ---------- */
  function apri() {
    pan.hidden = false; fab.setAttribute('aria-expanded', 'true');
    setTimeout(function () { (ok.checked ? txt : ok).focus(); }, 30);
  }
  function chiudiPan() { pan.hidden = true; fab.setAttribute('aria-expanded', 'false'); try { fab.focus(); } catch (e) { /* ignora */ } }
  fab.addEventListener('click', function () { if (pan.hidden) apri(); else chiudiPan(); });
  chiudi.addEventListener('click', chiudiPan);
  pan.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); chiudiPan(); } });
  ok.addEventListener('change', function () { stato.ok = ok.checked; salva(); if (ok.checked) err.textContent = ''; });

  /* ---------- rete ---------- */
  function chiama(percorso, opzioni) {
    return urlApi().then(function (base) {
      if (!base) throw new Error('no-url');
      return fetch(base + percorso, opzioni).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { st: r.status, j: j }; });
      });
    });
  }
  function posta(corpo) {
    var ctl = window.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 55000);
    corpo.cliente = cliente; corpo.sessione = stato.sess;
    return chiama('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(corpo), signal: ctl ? ctl.signal : undefined })
      .then(function (x) { clearTimeout(to); return x; }, function (e) { clearTimeout(to); throw e; });
  }
  var MSG_KO = 'Scusa, non riesco a rispondere adesso. Riprova tra poco' + '.';

  function mostraLead(l) {
    leadTesto.textContent = (l && l.testo) || 'Per passare la richiesta al titolare serve il tuo consenso.';
    leadElenco.textContent = '';
    var r = (l && l.riepilogo) || {};
    [['Nome', r.nome], ['Contatto', r.contatto], ['Date', r.date], ['Richiesta', r.richiesta]].forEach(function (c) {
      if (c[1]) leadElenco.appendChild(el('li', '', c[0] + ': ' + c[1]));
    });
    leadCk.checked = false; leadSi.disabled = true; lead.hidden = false;
    msgs.scrollTop = msgs.scrollHeight;
    setTimeout(function () { leadCk.focus(); }, 30);
  }
  leadCk.addEventListener('change', function () { leadSi.disabled = !leadCk.checked; });
  function chiudiLead() { lead.hidden = true; try { txt.focus(); } catch (e) { /* ignora */ } }
  function azioneLead(corpo, ok1) {
    leadSi.disabled = true; leadNo.disabled = true;
    posta(corpo).then(function (x) {
      var t = (x.j && x.j.reply) || (x.j && x.j.error) || MSG_KO;
      bolla(t, false); stato.storia.push({ role: 'assistant', content: t }); salva();
      if (x.st < 400 || !ok1) chiudiLead();
      else { leadNo.disabled = false; leadSi.disabled = !leadCk.checked; }
    }).catch(function () { bolla(MSG_KO, false); leadNo.disabled = false; leadSi.disabled = !leadCk.checked; })
      .then(function () { leadNo.disabled = false; });
  }
  leadSi.addEventListener('click', function () { if (leadCk.checked) azioneLead({ azione: 'lead-conferma', consenso: true }, true); });
  leadNo.addEventListener('click', function () { azioneLead({ azione: 'lead-annulla' }, false); });

  var inCorso = false;
  f.addEventListener('submit', function (e) {
    e.preventDefault(); err.textContent = '';
    if (inCorso) return;
    if (!ok.checked) { err.textContent = 'Accetta l’informativa privacy per usare la chat.'; ok.focus(); return; }
    var m = txt.value.trim();
    if (!m) return;
    if (m.length > MAX_MSG) { err.textContent = 'Messaggio troppo lungo (massimo ' + MAX_MSG + ' caratteri).'; return; }
    txt.value = '';
    bolla(m, true); stato.storia.push({ role: 'user', content: m }); salva();
    inCorso = true; inv.disabled = true;
    var att = bolla('Sto pensando…', false, true);
    posta({ messages: stato.storia.slice(-6) }).then(function (x) {
      att.remove();
      var t = (x.j && x.j.reply) || (x.j && x.j.error) || MSG_KO;
      bolla(t, false); stato.storia.push({ role: 'assistant', content: t }); salva();
      if (x.j && x.j.lead && x.j.lead.stato === 'consenso') mostraLead(x.j.lead);
    }).catch(function () { att.remove(); bolla(MSG_KO, false); })
      .then(function () { inCorso = false; inv.disabled = false; txt.focus(); });
  });
  txt.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable: true })); }
  });

  /* ---------- avvio: legge nome e benvenuto dal servizio; se il cliente non esiste non mostra nulla ---------- */
  function avvia() {
    d.body.appendChild(host);
    chiama('/config?cliente=' + encodeURIComponent(cliente), { method: 'GET', headers: { Accept: 'application/json' } })
      .then(function (x) {
        if (x.st === 404 || x.st === 403) { host.remove(); return; }
        if (x.st === 200 && x.j && x.j.nome) {
          cfg.nome = String(x.j.nome).slice(0, 100); cfg.benvenuto = String(x.j.benvenuto || cfg.benvenuto).slice(0, 400);
          cfg.demo = x.j.demo === true; cfg.avviso_demo = String(x.j.avviso_demo || '').slice(0, 300);
          cfg.email = String(x.j.email || '').slice(0, 100); cfg.whatsapp = String(x.j.whatsapp || '').replace(/\D/g, '').slice(0, 15);
          applicaConfig();
        }
      }).catch(function () { /* il widget resta con i testi di base */ });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
