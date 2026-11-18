/* Iceman AI - script condiviso: menu, comparsa, rete di sfondo, chat, sfera olografica. Nessuna libreria. */
const CHAT_ENDPOINT = 'https://formsubmit.co/ajax/b8739721a69abb0da83a8dd78efe3172';
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

  /* ---------- Chat di contatto ---------- */
  function chat() {
    var fab = d.createElement('button');
    fab.type = 'button'; fab.className = 'chat-fab'; fab.setAttribute('aria-label', 'Scrivici in chat');
    fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'chat-pan');
    fab.innerHTML = '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path d="M5 6h22v16H14l-6 5v-5H5z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="11" cy="14" r="1.6" fill="currentColor"/><circle cx="16" cy="14" r="1.6" fill="currentColor"/><circle cx="21" cy="14" r="1.6" fill="currentColor"/></svg>';
    var p = d.createElement('div');
    p.id = 'chat-pan'; p.className = 'chat-pan'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Chat di contatto'); p.hidden = true;
    p.innerHTML =
      '<div class="chat-top"><strong>Iceman &middot; assistente automatico</strong><button type="button" class="chat-x" aria-label="Chiudi la chat">&times;</button></div>' +
      '<div class="chat-msgs" aria-live="polite"><p class="bolla">Ciao, sono Iceman, un assistente automatico. Lasciami il tuo contatto e di cosa hai bisogno: ti rispondo appena possibile, di solito entro poche ore lavorative.</p></div>' +
      '<form class="chat-form" novalidate>' +
      '<label for="ch-nome">Nome (facoltativo)</label><input id="ch-nome" name="name" type="text" autocomplete="name" maxlength="80">' +
      '<label for="ch-cont">Contatto (email o telefono)</label><input id="ch-cont" name="contatto" type="text" autocomplete="email" maxlength="120" required>' +
      '<label for="ch-msg">Messaggio</label><textarea id="ch-msg" name="message" rows="4" maxlength="2000" required></textarea>' +
      '<div class="hp" aria-hidden="true"><label>Non compilare<input type="text" name="sito" tabindex="-1" autocomplete="off"></label></div>' +
      '<label class="chat-ok"><input id="ch-ok" type="checkbox" name="consenso"> <span>Ho letto l’<a href="privacy.html">informativa privacy</a> e accetto che i dati inseriti vengano usati per rispondermi</span></label>' +
      '<p class="chat-err" role="alert"></p>' +
      '<button type="submit" class="btn pri chat-invia">Invia</button></form>';
    d.body.appendChild(fab); d.body.appendChild(p);
    var msgs = p.querySelector('.chat-msgs'), f = p.querySelector('form'), err = p.querySelector('.chat-err'),
        inv = p.querySelector('.chat-invia'), chiudi = p.querySelector('.chat-x'), ultimo = fab;

    function apri(da) {
      ultimo = da || fab; p.hidden = false; fab.setAttribute('aria-expanded', 'true');
      d.body.classList.add('chat-aperta');
      setTimeout(function () { (f.hidden ? chiudi : f.elements.name).focus(); }, 30);
    }
    function chiudiPan() {
      p.hidden = true; fab.setAttribute('aria-expanded', 'false'); d.body.classList.remove('chat-aperta');
      try { ultimo.focus(); } catch (e) { fab.focus(); }
    }
    fab.addEventListener('click', function () { if (p.hidden) apri(fab); else chiudiPan(); });
    chiudi.addEventListener('click', chiudiPan);
    var bt = d.querySelectorAll('[data-chat]');
    for (var i = 0; i < bt.length; i++) bt[i].addEventListener('click', function (e) { apri(e.currentTarget); });
    d.addEventListener('keydown', function (e) {
      if (p.hidden) return;
      if (e.key === 'Escape') { e.stopPropagation(); chiudiPan(); return; }
      if (e.key === 'Tab') {
        var el = p.querySelectorAll('button:not([disabled]),input:not([tabindex="-1"]),textarea,a[href]');
        var pr = el[0], ul = el[el.length - 1];
        if (e.shiftKey && d.activeElement === pr) { e.preventDefault(); ul.focus(); }
        else if (!e.shiftKey && d.activeElement === ul) { e.preventDefault(); pr.focus(); }
      }
    }, true);

    function bolla(t, mia) { var b = d.createElement('p'); b.className = 'bolla' + (mia ? ' mia' : ''); b.textContent = t; msgs.appendChild(b); msgs.scrollTop = msgs.scrollHeight; return b; }
    function validoContatto(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || /^\+?[0-9][0-9 .\/-]{5,}$/.test(v); }
    f.addEventListener('submit', function (e) {
      e.preventDefault(); err.textContent = '';
      var nome = f.elements.name.value.trim(), cont = f.elements.contatto.value.trim(), m = f.elements.message.value.trim();
      if (!cont || !validoContatto(cont)) { err.textContent = 'Inserisci un’email o un numero di telefono valido.'; f.elements.contatto.focus(); return; }
      if (m.length < 3) { err.textContent = 'Scrivi un breve messaggio.'; f.elements.message.focus(); return; }
      if (!f.elements.consenso.checked) { err.textContent = 'Per inviare serve accettare l’informativa privacy.'; f.elements.consenso.focus(); return; }
      if (f.elements.sito.value) { fine(); return; } // trappola anti-bot: finto successo
      inv.disabled = true; inv.textContent = 'Invio in corso…';
      var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
      fetch(CHAT_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: nome, contatto: cont, message: m, _subject: 'Nuovo messaggio dal sito icemanai.it', _template: 'table', _captcha: 'false' }),
        signal: ctl ? ctl.signal : undefined
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || j.success === 'false' || j.success === false) throw new Error('x');
        bolla(m, true); fine();
      }); }).catch(function () {
        var b = bolla('Non sono riuscito a inviare: scrivici a ');
        var a = d.createElement('a'); a.href = 'mailto:info@icemanai.it?subject=Messaggio%20dal%20sito'; a.textContent = 'info@icemanai.it'; b.appendChild(a);
        inv.disabled = false; inv.textContent = 'Invia';
      }).then(function () { clearTimeout(to); });
    });
    function fine() {
      bolla('Ricevuto, ti rispondo presto.');
      f.reset(); f.hidden = true; inv.disabled = false; inv.textContent = 'Invia';
      chiudi.focus();
    }
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
