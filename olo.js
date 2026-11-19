/* Iceman AI - script condiviso: menu, comparsa, rete di sfondo, live chat, sfera olografica. Nessuna libreria. */
var ICEMAN_CHAT = {
  iceman: '', /* es. https://TUO-TUNNEL.trycloudflare.com/api/sito-chat quando Iceman espone il tunnel */
  pollinations: 'https://text.pollinations.ai/openai',
  model: 'openai',
  token: '' /* opzionale: stesso valore di ICEMAN_SITO_CHAT_TOKEN nel .env di Iceman */
};
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var ridotto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Rete di neuroni di sfondo (un solo canvas fisso) ---------- */
  function rete() {
    var c = d.createElement('canvas');
    c.id = 'rete'; c.setAttribute('aria-hidden', 'true');
    d.body.insertBefore(c, d.body.firstChild);
    var x = c.getContext('2d');
    if (!x) return;
    var nodi = [], W = 0, H = 0, dist = 150, mx = 0, my = 0, tx = 0, ty = 0;
    var attivo = false, id = 0, last = 0, INT = 1000 / 30;
    function conta() { return (innerWidth < 700) ? 40 : 90; }
    function misura() {
      var w = innerWidth, h = innerHeight;
      var vw = W || w, vh = H || h;
      W = c.width = w; H = c.height = h;
      dist = w < 700 ? 110 : 150;
      var n = conta();
      while (nodi.length > n) nodi.pop();
      for (var i = 0; i < nodi.length; i++) { nodi[i].x *= w / vw; nodi[i].y *= h / vh; }
      while (nodi.length < n) {
        var a = Math.random() * 6.283, v = 6 + Math.random() * 12;
        nodi.push({ x: Math.random() * w, y: Math.random() * h, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          z: 0.2 + Math.random() * 0.8, o: 0.55 + Math.random() * 0.3 });
      }
    }
    function disegna(dt) {
      var i, j, a, b;
      x.clearRect(0, 0, W, H);
      mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
      for (i = 0; i < nodi.length; i++) {
        a = nodi[i];
        if (dt) {
          a.x += a.vx * dt; a.y += a.vy * dt;
          if (a.x < -20) a.x = W + 20; else if (a.x > W + 20) a.x = -20;
          if (a.y < -20) a.y = H + 20; else if (a.y > H + 20) a.y = -20;
        }
        a.px = a.x + mx * a.z * 18; a.py = a.y + my * a.z * 18;
      }
      var D2 = dist * dist;
      x.lineWidth = 1;
      for (i = 0; i < nodi.length; i++) {
        a = nodi[i];
        for (j = i + 1; j < nodi.length; j++) {
          b = nodi[j];
          var dx = a.px - b.px, dy = a.py - b.py, q = dx * dx + dy * dy;
          if (q < D2) {
            x.strokeStyle = 'rgba(127,216,255,' + ((1 - q / D2) * 0.3).toFixed(3) + ')';
            x.beginPath(); x.moveTo(a.px, a.py); x.lineTo(b.px, b.py); x.stroke();
          }
        }
      }
      for (i = 0; i < nodi.length; i++) {
        a = nodi[i];
        x.fillStyle = 'rgba(127,216,255,' + a.o.toFixed(2) + ')';
        x.fillRect(Math.round(a.px - 1), Math.round(a.py - 1), 2.4, 2.4);
      }
    }
    misura(); disegna(0);
    var rt = 0;
    addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { misura(); disegna(0); }, 150); });
    if (ridotto) return;
    if (window.matchMedia && matchMedia('(hover: hover)').matches) {
      addEventListener('mousemove', function (e) { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
    }
    function ciclo(ts) {
      id = 0;
      if (!attivo) return;
      id = requestAnimationFrame(ciclo);
      if (ts - last < INT) return;
      var dt = Math.min((ts - last) / 1000, 0.1); last = ts;
      disegna(dt);
    }
    function agg() {
      if (!d.hidden && !attivo) { attivo = true; last = performance.now(); id = requestAnimationFrame(ciclo); }
      else if (d.hidden && attivo) { attivo = false; if (id) cancelAnimationFrame(id); id = 0; }
    }
    d.addEventListener('visibilitychange', agg);
    agg();
  }

  /* ---------- Live chat: risponde Iceman (automatico), non serve intervento manuale ---------- */
  function chat() {
    var SYS = [
      'Sei Iceman, assistente commerciale automatico di Iceman AI (icemanai.it).',
      'Rispondi sempre in italiano, cordiale, massimo quattro frasi, senza markdown.',
      'Sei un assistente automatico, non una persona. Proponi i servizi adatti (siti vetrina da 150 euro, social da 40 euro al mese, elenchi imprese da 29 euro, analisi sito gratuita, Dillo preventivi voce 15 euro al mese, traduzioni menu da 19 euro).',
      'Se chiedono un preventivo preciso, invita a lasciare email o telefono oppure a scrivere a info@icemanai.it.',
      'Non inventare prezzi diversi. Non promettere risultati su Google.',
    ].join('\n');

    var fab = d.createElement('button');
    fab.type = 'button'; fab.className = 'chat-fab'; fab.setAttribute('aria-label', 'Apri la chat live');
    fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'chat-pan');
    fab.innerHTML = '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path d="M5 6h22v16H14l-6 5v-5H5z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="11" cy="14" r="1.6" fill="currentColor"/><circle cx="16" cy="14" r="1.6" fill="currentColor"/><circle cx="21" cy="14" r="1.6" fill="currentColor"/></svg>';
    var p = d.createElement('div');
    p.id = 'chat-pan'; p.className = 'chat-pan'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Chat live con Iceman'); p.hidden = true;
    p.innerHTML =
      '<div class="chat-top"><strong>Iceman &middot; live chat</strong><button type="button" class="chat-x" aria-label="Chiudi la chat">&times;</button></div>' +
      '<div class="chat-msgs" aria-live="polite"><p class="bolla">Ciao, sono Iceman. Chiedimi cosa ti serve: sito web, social, elenchi clienti, analisi del tuo sito gratis, Dillo per preventivi a voce, o altro. Rispondo subito qui in chat.</p></div>' +
      '<form class="chat-form chat-live" novalidate>' +
      '<label class="chat-ok"><input id="ch-ok" type="checkbox" required> <span>Ho letto l’<a href="privacy.html">informativa privacy</a> e accetto l’uso della chat assistita da un sistema automatico</span></label>' +
      '<div class="chat-row"><textarea id="ch-msg" rows="2" maxlength="1200" placeholder="Scrivi qui…" required></textarea><button type="submit" class="btn pri chat-invia">Invia</button></div>' +
      '<p class="chat-err" role="alert"></p></form>';
    d.body.appendChild(fab); d.body.appendChild(p);
    var msgs = p.querySelector('.chat-msgs'), f = p.querySelector('form'), err = p.querySelector('.chat-err'),
      inv = p.querySelector('.chat-invia'), chiudi = p.querySelector('.chat-x'), txt = p.querySelector('#ch-msg'), ok = p.querySelector('#ch-ok');
    var storico = []; var nInvii = 0; var MAX = 40;

    try {
      var raw = sessionStorage.getItem('iceman-chat-storico');
      if (raw) storico = JSON.parse(raw);
      if (!Array.isArray(storico)) storico = [];
    } catch (e) { storico = []; }
    for (var si = 0; si < storico.length; si++) {
      if (storico[si].role === 'user') bolla(storico[si].content, true);
      else if (storico[si].role === 'assistant') bolla(storico[si].content, false);
    }

    function salva() {
      try { sessionStorage.setItem('iceman-chat-storico', JSON.stringify(storico.slice(-24))); } catch (e) { /* ignora */ }
    }

    function apri(da) {
      ultimo = da || fab; p.hidden = false; fab.setAttribute('aria-expanded', 'true');
      d.body.classList.add('chat-aperta');
      setTimeout(function () { txt.focus(); }, 30);
    }
    function chiudiPan() {
      p.hidden = true; fab.setAttribute('aria-expanded', 'false'); d.body.classList.remove('chat-aperta');
      try { ultimo.focus(); } catch (e) { fab.focus(); }
    }
    var ultimo = fab;
    fab.addEventListener('click', function () { if (p.hidden) apri(fab); else chiudiPan(); });
    chiudi.addEventListener('click', chiudiPan);
    var bt = d.querySelectorAll('[data-chat]');
    for (var i = 0; i < bt.length; i++) bt[i].addEventListener('click', function (e) { apri(e.currentTarget); });
    d.addEventListener('keydown', function (e) {
      if (p.hidden) return;
      if (e.key === 'Escape') { e.stopPropagation(); chiudiPan(); return; }
    }, true);

    function bolla(t, mia) {
      var b = d.createElement('p'); b.className = 'bolla' + (mia ? ' mia' : ''); b.textContent = t;
      msgs.appendChild(b); msgs.scrollTop = msgs.scrollHeight; return b;
    }
    function bollaAttesa() {
      var b = d.createElement('p'); b.className = 'bolla chat-pensa'; b.textContent = 'Sto pensando…';
      msgs.appendChild(b); msgs.scrollTop = msgs.scrollHeight; return b;
    }

    function chiediIceman(messages) {
      return urlChat().then(function (url) {
      if (!url) throw new Error('no-ice');
      var hdr = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (ICEMAN_CHAT.token) hdr['X-Iceman-Sito'] = ICEMAN_CHAT.token;
      return fetch(url, { method: 'POST', headers: hdr, body: JSON.stringify({ messages: messages }) })
        .then(function (r) {
          return r.json().then(function (j) {
            if (!r.ok || !j.reply) throw new Error(j.error || 'ice');
            return j.reply;
          });
        });
      });
    }

    function urlChat() {
      var fisso = (ICEMAN_CHAT.iceman || '').trim();
      if (fisso) return Promise.resolve(fisso);
      return fetch('chat-endpoint.json?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (j) { return (j && j.url ? String(j.url) : '').trim(); })
        .catch(function () { return ''; });
    }

    function chiediPollinations(messages) {
      return fetch(ICEMAN_CHAT.pollinations, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ model: ICEMAN_CHAT.model, messages: [{ role: 'system', content: SYS }].concat(messages) }),
      }).then(function (r) {
        return r.json().then(function (j) {
          var c = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
          if (!r.ok || !c) throw new Error('poll');
          return String(c).trim();
        });
      });
    }

    function rispondi(messages) {
      return chiediIceman(messages).catch(function () { return chiediPollinations(messages); });
    }

    f.addEventListener('submit', function (e) {
      e.preventDefault(); err.textContent = '';
      if (nInvii >= MAX) { err.textContent = 'Hai raggiunto il limite di messaggi per questa sessione. Scrivi a info@icemanai.it.'; return; }
      if (!ok.checked) { err.textContent = 'Accetta l’informativa privacy per usare la chat.'; ok.focus(); return; }
      var m = txt.value.trim();
      if (m.length < 1) return;
      txt.value = '';
      bolla(m, true);
      storico.push({ role: 'user', content: m });
      salva();
      nInvii += 1;
      inv.disabled = true;
      var att = bollaAttesa();
      var ctl = window.AbortController ? new AbortController() : null;
      var to = setTimeout(function () { if (ctl) ctl.abort(); }, 55000);
      rispondi(storico)
        .then(function (risp) {
          att.remove();
          bolla(risp, false);
          storico.push({ role: 'assistant', content: risp });
          salva();
        })
        .catch(function () {
          att.remove();
          bolla('Scusa, non riesco a rispondere adesso. Scrivi a info@icemanai.it e ti rispondiamo al più presto.', false);
        })
        .then(function () {
          clearTimeout(to);
          inv.disabled = false;
          txt.focus();
        });
    });
    txt.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })); }
    });
  }

  function pronto() {
    rete();
    chat();
    // Tendina Servizi: si chiude con Esc o clic fuori
    var dd = d.querySelector('.dd');
    if (dd) {
      d.addEventListener('click', function (e) { if (dd.open && !dd.contains(e.target)) dd.open = false; });
      d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dd.open) { dd.open = false; dd.querySelector('summary').focus(); } });
    }
    // Menu telefono
    var b = d.querySelector('.burger'), n = d.getElementById('menu');
    if (b && n) {
      b.addEventListener('click', function () {
        var o = n.classList.toggle('aperto');
        b.setAttribute('aria-expanded', o ? 'true' : 'false');
      });
      d.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && n.classList.contains('aperto')) {
          n.classList.remove('aperto'); b.setAttribute('aria-expanded', 'false'); b.focus();
        }
      });
      n.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') { n.classList.remove('aperto'); b.setAttribute('aria-expanded', 'false'); }
      });
    }

    // Comparsa leggera
    var r = d.querySelectorAll('.rev');
    if (!('IntersectionObserver' in window) || ridotto) {
      for (var i = 0; i < r.length; i++) r[i].classList.add('vis');
    } else {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } });
      }, { threshold: 0.1 });
      for (var j = 0; j < r.length; j++) io.observe(r[j]);
    }

    // Sfera olografica
    var c = d.getElementById('sfera');
    if (!c || !c.getContext) return;
    var x = c.getContext('2d');
    var N = 240, pts = [], W = 0, H = 0, dpr = 1;
    var ga = Math.PI * (3 - Math.sqrt(5));
    for (var k = 0; k < N; k++) {
      var y = 1 - (k / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), t = ga * k;
      pts.push([Math.cos(t) * rr, y, Math.sin(t) * rr]);
    }
    function misura() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var w = c.clientWidth, h = c.clientHeight;
      if (!w || !h) return;
      W = c.width = Math.round(w * dpr); H = c.height = Math.round(h * dpr);
    }
    var ang = 0, tilt = 0.35, proj = new Array(N), SOGLIA = 0.42 * 0.42;
    function disegna() {
      if (!W) return;
      x.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.36;
      var ca = Math.cos(ang), sa = Math.sin(ang), ct = Math.cos(tilt), st = Math.sin(tilt), i, j;
      for (i = 0; i < N; i++) {
        var p = pts[i];
        var x1 = p[0] * ca + p[2] * sa, z1 = -p[0] * sa + p[2] * ca;
        var y2 = p[1] * ct - z1 * st, z2 = p[1] * st + z1 * ct;
        var f = 1 / (1.9 - z2 * 0.5);
        proj[i] = [cx + x1 * R * f * 1.5, cy + y2 * R * f * 1.5, z2, x1, y2];
      }
      x.lineWidth = Math.max(1, dpr * 0.7);
      for (i = 0; i < N; i++) {
        var a = proj[i];
        for (j = i + 1; j < N; j++) {
          var b = proj[j], dx = a[3] - b[3], dy = a[4] - b[4], dz = a[2] - b[2];
          var dd = dx * dx + dy * dy + dz * dz;
          if (dd < SOGLIA) {
            var al = (1 - dd / SOGLIA) * 0.5 * (0.35 + 0.65 * ((a[2] + b[2]) / 2 + 1) / 2);
            x.strokeStyle = 'rgba(61,224,255,' + al.toFixed(3) + ')';
            x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
          }
        }
      }
      for (i = 0; i < N; i++) {
        var q = proj[i], dep = (q[2] + 1) / 2;
        x.fillStyle = dep > 0.6 ? 'rgba(200,245,255,' + (0.5 + dep * 0.5).toFixed(2) + ')' : 'rgba(43,123,255,' + (0.3 + dep * 0.6).toFixed(2) + ')';
        var s = (1 + dep * 1.6) * dpr;
        x.fillRect(q[0] - s / 2, q[1] - s / 2, s, s);
      }
    }
    misura(); disegna();
    if (window.ResizeObserver) new ResizeObserver(function () { misura(); disegna(); }).observe(c);
    else window.addEventListener('resize', function () { misura(); disegna(); });
    if (ridotto) return; // un solo fotogramma, nessuna animazione

    var attivo = false, visibile = true, last = 0, id = 0, INTERVALLO = 1000 / 30;
    function ciclo(ts) {
      id = 0;
      if (!attivo) return;
      id = requestAnimationFrame(ciclo);
      if (ts - last < INTERVALLO) return;
      last = ts; ang += 0.006; disegna();
    }
    function aggiorna() {
      var vuole = visibile && !d.hidden;
      if (vuole && !attivo) { attivo = true; id = requestAnimationFrame(ciclo); }
      else if (!vuole && attivo) { attivo = false; if (id) cancelAnimationFrame(id); id = 0; }
    }
    d.addEventListener('visibilitychange', aggiorna);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visibile = es[0].isIntersecting; aggiorna(); }).observe(c);
    }
    aggiorna();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', pronto); else pronto();
})();
