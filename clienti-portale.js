(function () {
  'use strict';
  var base = '';
  function ep() {
    if (base) return Promise.resolve(base);
    return fetch('/clienti-endpoint.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) { base = String(j && j.url || '').trim().replace(/\/$/, ''); return base; })
      .catch(function () { return ''; });
  }
  function api(path, opts) {
    opts = opts || {};
    opts.credentials = 'include';
    if (opts.body && typeof opts.body === 'object') {
      opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
      opts.body = JSON.stringify(opts.body);
    }
    return ep().then(function (url) {
      if (!url) throw new Error('endpoint non configurato');
      return fetch(url + path, opts);
    });
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function err(el, msg) { if (el) { el.className = 'esito err'; el.textContent = msg; } }
  function ok(el, msg) { if (el) { el.className = 'esito ok'; el.textContent = msg; } }
  function tokenUrl() {
    var p = new URLSearchParams(location.search);
    return p.get('token') || '';
  }
  function bindRegistrati() {
    var f = qs('#form-registrati');
    if (!f) return;
    var es = qs('.esito', f);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var email = (qs('[name=email]', f) || {}).value || '';
      var pw = (qs('[name=password]', f) || {}).value || '';
      var pw2 = (qs('[name=password2]', f) || {}).value || '';
      if (pw !== pw2) { err(es, 'Le password non coincidono.'); return; }
      ok(es, 'Invio in corso…');
      api('/registra', { method: 'POST', body: { email: email, password: pw } })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j, status: r.status }; }); })
        .then(function (x) {
          if (!x.ok) throw new Error((x.j && x.j.detail) || 'Errore ' + x.status);
          ok(es, x.j.verificato ? 'Account attivo. Puoi accedere.' : 'Controlla la posta per confermare l\'account.');
          if (x.j.verificato) setTimeout(function () { location.href = 'accedi.html'; }, 1200);
        })
        .catch(function (e) { err(es, e.message || 'Registrazione non riuscita.'); });
    });
  }
  function bindAccedi() {
    var f = qs('#form-accedi');
    if (!f) return;
    var es = qs('.esito', f);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var email = (qs('[name=email]', f) || {}).value || '';
      var pw = (qs('[name=password]', f) || {}).value || '';
      ok(es, 'Accesso…');
      api('/accedi', { method: 'POST', body: { email: email, password: pw } })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok) throw new Error((x.j && x.j.detail) || 'Credenziali non valide');
          location.href = 'area-clienti.html';
        })
        .catch(function (e) { err(es, e.message || 'Accesso non riuscito.'); });
    });
  }
  function bindRecupero() {
    var f = qs('#form-recupero');
    if (!f) return;
    var es = qs('.esito', f);
    var tok = tokenUrl();
    if (tok && qs('#form-reset')) {
      qs('#form-recupero').hidden = true;
      qs('#form-reset').hidden = false;
      qs('[name=token]', qs('#form-reset')).value = tok;
    }
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var email = (qs('[name=email]', f) || {}).value || '';
      ok(es, 'Invio…');
      api('/recupero', { method: 'POST', body: { email: email } })
        .then(function (r) { return r.json(); })
        .then(function () { ok(es, 'Se l\'email è registrata riceverai le istruzioni.'); })
        .catch(function () { ok(es, 'Se l\'email è registrata riceverai le istruzioni.'); });
    });
    var fr = qs('#form-reset');
    if (fr) {
      fr.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var t = (qs('[name=token]', fr) || {}).value || '';
        var pw = (qs('[name=password]', fr) || {}).value || '';
        var pw2 = (qs('[name=password2]', fr) || {}).value || '';
        var es2 = qs('.esito', fr);
        if (pw !== pw2) { err(es2, 'Le password non coincidono.'); return; }
        api('/reset-password', { method: 'POST', body: { token: t, password: pw } })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (x) {
            if (!x.ok) throw new Error((x.j && x.j.detail) || 'Token non valido');
            ok(es2, 'Password aggiornata. Reindirizzamento…');
            setTimeout(function () { location.href = 'accedi.html'; }, 1200);
          })
          .catch(function (e) { err(es2, e.message || 'Reset non riuscito.'); });
      });
    }
  }
  function bindVerifica() {
    var es = qs('#esito-verifica');
    var tok = tokenUrl();
    if (!tok) { err(es, 'Link senza token.'); return; }
    ok(es, 'Verifica in corso…');
    api('/verifica', { method: 'POST', body: { token: tok } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) throw new Error((x.j && x.j.detail) || 'Token non valido');
        ok(es, 'Email confermata. Puoi accedere.');
      })
      .catch(function (e) { err(es, e.message || 'Verifica non riuscita.'); });
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function bindArea() {
    var tab = qs('#tabella-pratiche');
    var es = qs('#esito-area');
    if (!tab) return;
    api('/sessione', { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        if (!s.autenticato) {
          location.href = 'accedi.html?next=area-clienti.html';
          return;
        }
        var ben = qs('#benvenuto');
        if (ben) ben.textContent = 'Account: ' + s.email;
        return api('/richieste', { method: 'GET' });
      })
      .then(function (r) {
        if (!r) return;
        return r.json().then(function (d) {
          if (!r.ok) throw new Error((d && d.detail) || 'Errore caricamento');
          var righe = d.richieste || [];
          if (!righe.length) {
            tab.innerHTML = '<p class="mu">Nessuna richiesta con questa email. <a href="servizi-pmi.html">Invia una richiesta</a>.</p>';
            return;
          }
          var html = '<table class="tabella-pratiche"><thead><tr><th>#</th><th>Servizio</th><th>Stato</th><th>Prossimo passo</th><th></th></tr></thead><tbody>';
          righe.forEach(function (row) {
            html += '<tr><td>' + esc(row.id) + '</td><td>' + esc(row.servizio_id) + ' — ' + esc(row.nome_servizio) +
              '</td><td>' + esc(row.stato) + '</td><td>' + esc(row.prossima_azione) +
              '</td><td><a class="btn sec" href="pratica.html?id=' + encodeURIComponent(row.id) + '">Dettaglio</a></td></tr>';
          });
          html += '</tbody></table>';
          tab.innerHTML = html;
        });
      })
      .catch(function (e) { err(es, e.message || 'Caricamento fallito.'); });
    var esci = qs('#esci');
    if (esci) {
      esci.addEventListener('click', function () {
        api('/esci', { method: 'POST', body: {} }).finally(function () { location.href = 'index.html'; });
      });
    }
  }
  function bindPratica() {
    var box = qs('#dettaglio-pratica');
    var es = qs('#esito-pratica');
    if (!box) return;
    var id = new URLSearchParams(location.search).get('id');
    if (!id) { err(es, 'Pratica non indicata.'); return; }
    api('/sessione', { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        if (!s.autenticato) {
          location.href = 'accedi.html?next=' + encodeURIComponent(location.pathname + location.search);
          return;
        }
        return api('/richieste/' + encodeURIComponent(id), { method: 'GET' });
      })
      .then(function (r) {
        if (!r) return;
        return r.json().then(function (d) {
          if (!r.ok) throw new Error((d && d.detail) || 'Errore ' + r.status);
          box.innerHTML =
            '<h2>Richiesta #' + esc(d.id) + '</h2>' +
            '<p><strong>Servizio:</strong> ' + esc(d.servizio_id) + ' — ' + esc(d.nome_servizio) + '</p>' +
            '<p><strong>Stato:</strong> ' + esc(d.stato) + '</p>' +
            '<p class="vetro">' + esc(d.prossima_azione) + '</p>' +
            (d.azienda ? '<p><strong>Azienda:</strong> ' + esc(d.azienda) + '</p>' : '') +
            '<p><strong>Descrizione inviata:</strong></p><pre style="white-space:pre-wrap;font:inherit;color:var(--tx)">' +
            esc(d.messaggio) + '</pre>' +
            '<p class="small mu"><a href="area-clienti.html">← Tutte le pratiche</a></p>';
        });
      })
      .catch(function (e) { err(es, e.message || 'Dettaglio non disponibile.'); });
  }
  document.addEventListener('DOMContentLoaded', function () {
    bindRegistrati();
    bindAccedi();
    bindRecupero();
    bindVerifica();
    bindArea();
    bindPratica();
  });
})();