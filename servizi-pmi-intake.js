(function(){'use strict';
var MAP={S1:{oggetto:'Richiesta \u2014 fatture WooCommerce',utm:'woocommerce-fatture'},S2:{oggetto:'Richiesta \u2014 email ordine WooCommerce',utm:'woocommerce-email'},S3:{oggetto:'Richiesta \u2014 scorte Shopify POS',utm:'shopify-pos'},S4:{oggetto:'Richiesta \u2014 confronto listini',utm:'confronto-listini'},S5:{oggetto:'Richiesta \u2014 riconciliazione bonifici',utm:'riconciliazione-bonifici'}};
var baseUrl='';
function ep(){if(baseUrl)return Promise.resolve(baseUrl);
return fetch('/servizi-intake-endpoint.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json();}).then(function(j){baseUrl=String(j&&j.url||'').trim();return baseUrl;}).catch(function(){return'';});}
function mailFallback(sid,email,msg,az){
  var m=MAP[sid]||{oggetto:'Richiesta servizio PMI',utm:''};
  var body='Servizio: '+sid+'\nEmail: '+email+'\n'+(az?'Azienda: '+az+'\n':'')+'\n'+msg;
  location.href='mailto:info@icemanai.it?subject='+encodeURIComponent(m.oggetto)+'&body='+encodeURIComponent(body);
}
function bindForm(f){
  var sid=f.getAttribute('data-servizio')||'S1';
  var es=f.querySelector('.esito');
  f.addEventListener('submit',function(ev){
    ev.preventDefault();
    var email=(f.querySelector('[name=email]')||{}).value||'';
    var msg=(f.querySelector('[name=messaggio]')||{}).value||'';
    var az=(f.querySelector('[name=azienda]')||{}).value||'';
    if(!email||!msg){if(es){es.className='esito err';es.textContent='Inserisci email e descrizione del problema.';}return;}
    var utm=(MAP[sid]||{}).utm||'';
    if(es){es.className='esito';es.textContent='Invio in corso\u2026';}
    ep().then(function(url){
      if(!url){mailFallback(sid,email,msg,az);if(es)es.textContent='Apertura mail (invio automatico non disponibile).';return;}
      return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,servizio:sid,messaggio:msg,azienda:az,utm_campaign:'compito241',utm_content:utm})})
        .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
        .then(function(j){if(es){es.className='esito ok';es.textContent='Richiesta registrata'+(j.id?' #'+j.id:'')+(j.nuova===false?' (gi\u00e0 inviata in precedenza)':'. Riceverai risposta via email.');}})
        .catch(function(){mailFallback(sid,email,msg,az);if(es)es.textContent='Invio via email (programma di posta).';});
    });
  });
}
document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('.form-servizi-pmi').forEach(bindForm);});
})();