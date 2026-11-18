/* Iceman AI - script condiviso: menu, comparsa, sfera olografica. Nessuna libreria. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var ridotto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pronto() {
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
