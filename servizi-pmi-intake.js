(function(){'use strict';
var MAP={S1:{oggetto:'Richiesta — fatture WooCommerce',utm:'woocommerce-fatture'},S2:{oggetto:'Richiesta — email ordine WooCommerce',utm:'woocommerce-email'},S3:{oggetto:'Richiesta — scorte Shopify POS',utm:'shopify-pos'},S4:{oggetto:'Richiesta — confronto listini',utm:'confronto-listini'},S5:{oggetto:'Richiesta — riconciliazione bonifici',utm:'riconciliazione-bonifici'},E1:{oggetto:'Richiesta — elenchi negozi e-commerce',utm:'elenchi-ecommerce-form'}};
var baseUrl='';
function ep(){if(baseUrl)return Promise.resolve(baseUrl);
return fetch('/servizi-intake-endpoint.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json();}).then(function(j){baseUrl=String(j&&j.url||'').trim();return baseUrl;}).catch(function(){return'';});}
function qsUtm(){
 try{var p=new URLSearchParams(location.search);return{campaign:String(p.get('utm_campaign')||'').trim(),content:String(p.get('utm_content')||'').trim()};}catch(e){return{campaign:'',content:''};}
}
function bodyUtm(){
 var b=document.body;return{campaign:(b&&b.getAttribute('data-utm-campaign'))||'',content:(b&&b.getAttribute('data-utm-content'))||''};
}
function trackFor(f){
 var sid=f.getAttribute('data-servizio')||'S1';
 var q=qsUtm();
 var b=bodyUtm();
 var fc=String(f.getAttribute('data-utm-campaign')||'').trim();
 var ft=String(f.getAttribute('data-utm-content')||'').trim();
 var campaign=q.campaign||fc||b.campaign||'compito245';
 var content=q.content||ft||b.content||(MAP[sid]||{}).utm||'';
 return{campaign:campaign,content:content};
}
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
    var tr=trackFor(f);
    if(es){es.className='esito';es.textContent='Invio in corso…';}
    ep().then(function(url){
      if(!url){mailFallback(sid,email,msg,az);if(es)es.textContent='Apertura mail (invio automatico non disponibile).';return;}
      return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,servizio:sid,messaggio:msg,azienda:az,utm_campaign:tr.campaign,utm_content:tr.content})})
        .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
        .then(function(j){if(es){es.className='esito ok';es.textContent='Richiesta registrata'+(j.id?' #'+j.id:'')+(j.nuova===false?' (già inviata in precedenza)':'. Riceverai risposta via email.');}})
        .catch(function(){mailFallback(sid,email,msg,az);if(es)es.textContent='Invio via email (programma di posta).';});
    });
  });
}
document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('.form-servizi-pmi').forEach(bindForm);});
})();
