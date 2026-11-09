(()=>{
 const $=id=>document.getElementById(id),STORE='aarrejahti-card-generator-v1';
 const skull='<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1C5 1 1 5 1 12c0 5 3 7 5 8v7h4v-5h4v5h4v-7c3-2 5-4 5-8C23 5 19 1 12 1ZM7 10a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm10 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" fill-rule="evenodd"/></svg>';
 const coord=id=>String.fromCharCode(65+id%12)+(1+Math.floor(id/12));
 const labels=['kolmio','neliö','risti','ympyrä'];
 let card=null,index=0,worker=null,timer=null;
 const status=(text,error=false)=>{$('status').textContent=text;$('status').classList.toggle('error',error)};
 function shape(s,color){
  const fill=color?'#fff':'#203f38',attrs=`fill="${fill}" stroke="#203f38" stroke-width="2"`;
  const element=s===0?`<path d="M15 3 28 27H2Z" ${attrs}/>`:s===1?`<rect x="4" y="4" width="22" height="22" ${attrs}/>`:`<circle cx="15" cy="15" r="12" ${attrs}/>`;
  return `<svg viewBox="0 0 30 30" aria-hidden="true">${element}</svg>`;
 }
 function save(){try{localStorage.setItem(STORE,JSON.stringify({card,index}))}catch{}}
 function render(){
  $('card-name').textContent=card.name;
  $('markers').replaceChildren();
  for(const s of [0,1,3])for(const color of [0,1]){
   const row=document.createElement('div');row.className='marker-cell';
   row.innerHTML=shape(s,color);
   const positions=document.createElement('span');positions.className='positions';
   const values=card.landmarks.filter(m=>m.s===s&&m.color===color).map(m=>coord(m.id));
   positions.textContent=values.join('  ');row.append(positions);
   row.setAttribute('aria-label',`${color?'Valkoinen':'Musta'} ${labels[s]}: ${values.join(', ')}`);$('markers').append(row);
  }
  $('trips').replaceChildren();
  for(let i=0;i<6;i++){
   const b=document.createElement('button');b.type='button';b.innerHTML=i===5?skull:i===4?'×':String(i+1);
   b.setAttribute('aria-label',i<4?`Retki ${i+1}`:i===5?'Pääkalloretki':'Harharetki');
   b.setAttribute('aria-current',String(i===index));b.onclick=()=>select(i);$('trips').append(b);
  }
  const t=card.tasks[index];
  $('trip-title').textContent=index<4?`Retki ${index+1}`:index===5?'Pääkalloretki':'Harharetki';
  $('trip-score').textContent=`${Math.round(t.difficulty.score)} p.`;
  $('trip-rule').textContent=index<4?'Etsi aarre.':index===5?'Etsi aarre ja väärä vihje.':'Etsi aarre ja poistettava kuvio.';
  $('clues').replaceChildren();
  for(const id of t.clueIds){const c=document.createElement('span');c.className='clue-number';c.textContent=id;c.setAttribute('aria-label',`Vihjekortti ${id}`);$('clues').append(c)}
  $('trip-count').textContent=`Vihjekortit ${t.clueIds.length} kpl.`;
  $('next').disabled=index===5;$('answer').disabled=false;
 }
 function select(i){if(!card||worker)return;index=i;render();save()}
 function finish(){clearTimeout(timer);worker?.terminate();worker=null;document.body.classList.remove('loading');$('generate').disabled=false;$('next').disabled=!card||index===5;$('answer').disabled=!card}
 function generate(seed){
  if(worker)return;
  seed=seed??crypto.getRandomValues(new Uint32Array(1))[0];
  document.body.classList.add('loading');$('generate').disabled=true;$('next').disabled=true;$('answer').disabled=true;
  document.querySelectorAll('#trips button').forEach(b=>b.disabled=true);
  status('Arvotaan uutta korttia…');
  try{worker=new Worker('worker.js')}catch{finish();status('Avaa sovellus verkkopalvelimelta. Käynnistä paikallisesti Avaa_generaattori.cmd.',true);if(card)render();return}
  timer=setTimeout(()=>{finish();if(card)render();status('Arvonta kesti liian kauan. Kokeile uudelleen.',true)},45000);
  worker.onmessage=({data})=>{
   if(data.status){status(data.status);return}
   finish();
   if(data.error){if(card)render();status(data.error,true);return}
   card=data.card;index=0;render();save();
   const url=new URL(location.href);url.searchParams.set('kortti',card.seed);history.replaceState(null,'',url);
   status('');
  };
  worker.onerror=()=>{finish();if(card)render();status('Arvonta ei käynnistynyt. Tarkista yhteys ja yritä uudelleen.',true)};
  worker.postMessage({seed});
 }
 $('generate').onclick=()=>{if(card)$('replace-dialog').showModal();else generate()};
 $('confirm-generate').onclick=()=>{$('replace-dialog').close();generate()};
 $('next').onclick=()=>select(Math.min(5,index+1));
 $('help').onclick=()=>$('help-dialog').showModal();
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
 $('answer').onclick=()=>{
  const t=card.tasks[index];$('answer-title').textContent=`${$('trip-title').textContent}: ratkaisu`;
  const area=$('answer-content');area.replaceChildren();
  function line(label,value){const p=document.createElement('p');p.className='answer-label';p.textContent=label;const v=document.createElement('p');v.className='answer-value';v.textContent=value;area.append(p,v);return v}
  line('AARRE · RATKAISUKORTIN KOODI',t.key);
  if(t.kind==='skull')line('VÄÄRÄ VIHJE · RATKAISUKORTIN KOODI',t.wrongKey);
  if(t.kind==='disappearance')line('POISTETTAVA KUVIO · RATKAISUKORTIN KOODI',t.removeKey);
  $('answer-dialog').showModal();
 };
 const requested=new URL(location.href).searchParams.get('kortti');
 try{const saved=JSON.parse(localStorage.getItem(STORE));if(saved?.card?.model==='D1'&&saved.card.clueRules==='R2'&&saved.card.answerScheme==='314160'&&saved.card.tasks.length===6&&saved.card.landmarks.length>=6){card=saved.card;index=Math.min(5,Math.max(0,Number(saved.index)||0))}}catch{}
 // Keep an existing card and selected expedition when migrating the old last-two order.
 if(card){const selected=card.tasks[index];card.tasks=[...card.tasks.filter(t=>!t.kind),card.tasks.find(t=>t.kind==='disappearance'),card.tasks.find(t=>t.kind==='skull')].map((t,i)=>({...t,id:i+1}));index=card.tasks.findIndex(t=>t.target===selected.target&&t.kind===selected.kind)}
 if(card&&(!requested||String(card.seed)===requested)){render();save();status('')}else generate(requested&&/^\d{1,10}$/.test(requested)?Number(requested)>>>0:undefined);
 if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).catch(()=>{});
})();
