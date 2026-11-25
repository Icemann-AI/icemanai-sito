(function(){'use strict';
var GUIDE=[
  {id:'S1',cat:'WooCommerce',sym:['fattura','woocommerce','pdf','sdi','ordine','completato','fatturazione'],title:'Fatture WooCommerce mancanti',blurb:'Ordine pagato senza PDF o invio SDI.',url:'/servizi/fatture-woocommerce.html',prezzo:'da 190 euro (proposta)'},
  {id:'S2',cat:'WooCommerce',sym:['email','ordine','woocommerce','smtp','notifica','mail','spam','riceve','cliente'],title:'Email ordine WooCommerce',blurb:'Cliente o admin senza notifica, testi diversi.',url:'/servizi/email-ordine-woocommerce.html',prezzo:'da 240 euro (proposta)'},
  {id:'S3',cat:'Shopify',sym:['shopify','scorte','stock','pos','inventario','sku','overselling'],title:'Scorte Shopify e POS',blurb:'Quantita diverse tra negozio e online.',url:'/servizi/shopify-scorte-pos.html',prezzo:'audit 150 euro (proposta)'},
  {id:'S4',cat:'Excel e CSV',sym:['listino','excel','csv','fornitore','confronto','prezzi','duplicati','import'],title:'Listini e confronto fornitori',blurb:'Due file, prezzi discordi o file sporco.',url:'/listini-puliti',prezzo:'29 euro primi 3 clienti, poi 39 euro/file'},
  {id:'S4b',cat:'Excel e CSV',sym:['differenze','delta','confrontare','due file'],title:'Confronto due listini',blurb:'Report delta codici e prezzi.',url:'/servizi/confronto-due-listini-fornitore.html',prezzo:'29 euro primi 3 clienti, poi 39 euro/file'},
  {id:'S5',cat:'Pagamenti',sym:['bonifico','riconciliazione','banca','fatture','partite','estratto'],title:'Riconciliazione bonifici e fatture',blurb:'Movimenti non abbinati al registro.',url:'/servizi/riconciliazione-bonifici-fatture.html',prezzo:'99 euro (proposta #235)'}
];
var CATS=['Tutte','WooCommerce','Shopify','Excel e CSV','Pagamenti'];
var STOP=new Set(['il','lo','la','i','gli','le','un','una','del','della','dei','delle','dell','non','che','con','per','ma','se','di','da','su','in','al','alla','de','the','and','mi','ti','si']);
var q=document.getElementById('cerca-sintomo');
var box=document.getElementById('risultati-guide');
var fil=document.getElementById('filtri-cat');
var catAttiva='Tutte';
function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');}
function keywords(t){
  return norm(t).split(/\s+/).filter(function(w){return w.length>=2&&!STOP.has(w);});
}
function render(){
  if(!box)return;
  var t=q?q.value.trim():'';
  var out=GUIDE.filter(function(g){
    if(catAttiva!=='Tutte'&&g.cat!==catAttiva)return false;
    if(!t)return true;
    var hay=norm(g.title+' '+g.blurb+' '+g.sym.join(' '));
    var ws=keywords(t);
    if(!ws.length)return hay.indexOf(norm(t))>=0;
    return ws.every(function(w){return hay.indexOf(w)>=0;});
  });
  box.innerHTML=out.length?out.map(function(g){
    return '<a class="vetro scheda rev vis" href="'+g.url+'"><span class="eti">'+g.cat+' Â· guida gratuita</span><h3>'+g.title+'</h3><p class="mu">'+g.blurb+'</p><span class="prezzo">'+g.prezzo+'</span></a>';
  }).join(''):'<p class="mu vetro rev vis">Nessuna guida per questo testo. Prova fattura, email, shopify, listino o bonifico, oppure <a href="servizi-pmi.html">apri hub servizi</a>.</p>';
}
function setCat(c){
  catAttiva=c;
  if(fil)fil.querySelectorAll('[data-cat]').forEach(function(b){
    b.setAttribute('aria-pressed',b.getAttribute('data-cat')===c?'true':'false');
    b.classList.toggle('pri',b.getAttribute('data-cat')===c);
  });
  render();
}
function init(){
  if(fil){
    fil.innerHTML=CATS.map(function(c){
      return '<button type="button" class="btn sec" data-cat="'+c+'" aria-pressed="'+(c==='Tutte'?'true':'false')+'">'+c+'</button>';
    }).join('');
    fil.addEventListener('click',function(ev){
      var b=ev.target.closest('[data-cat]');
      if(b)setCat(b.getAttribute('data-cat'));
    });
    setCat('Tutte');
  }
  if(q){q.addEventListener('input',render);}
  render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

