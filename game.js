(() => {
  const $=id=>document.getElementById(id);
  // Safari's bars and visual viewport can change without a full window resize.
  function fitViewport(){
    const viewport=window.visualViewport;
    const height=Math.floor(Math.min(window.innerHeight,viewport?.height||window.innerHeight));
    document.documentElement.style.setProperty('--visible-height',`${height}px`);
    document.body.classList.toggle('short-viewport',height<740);
  }
  window.addEventListener('resize',fitViewport);
  window.visualViewport?.addEventListener('resize',fitViewport);
  window.visualViewport?.addEventListener('scroll',fitViewport);
  fitViewport();
  const coord=id=>String.fromCharCode(65+id%12)+(Math.floor(id/12)+1);
  const skull='<svg class="skull-icon" viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1C5 1 1 5 1 12c0 5 3 7 5 8v7h4v-5h4v5h4v-7c3-2 5-4 5-8C23 5 19 1 12 1Zm-5 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm10 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-5 6 3 4H9Z" fill-rule="evenodd"/></svg>';
  const titles={normal:'Retki',skull:'Pääkalloretki',disappearance:'Harharetki',addition:'Hukkareissu'};
  const prompts={normal:'Kaikkien vihjeiden tulee toteutua.',skull:'Yksi vihje on väärä. Merkitse se napauttamalla ja etsi aarre.',disappearance:'Valitse Poista kuvio tai Arkku ja napauta ruutua.',addition:'Lisää puuttuva kuvio tyhjään ruutuun ja etsi aarre.'};
  let addedCell=null,placing='marker';
  const completed=new Set();
  const markerName=m=>`${m.color?'valkoinen':'musta'} ${['kolmio','neliö','risti','ympyrä'][m.s]}`;
  let round=null,index=0,roundNumber=0,phase='loading',selected=null,lastSelected=null,rejectedCell=null,mutedClue=null,mutedMarker=null,started=0,elapsed=0,wrong=0,totalWrong=0,request=0;
  const task=()=>round.tasks[index];
  // Oma vahvistusdialogi (korvaa selaimen confirm()-ikkunan).
  let asking=false;
  function ask(text,yes='Vahvista'){
    return new Promise(resolve=>{
      const d=$('confirm');asking=true;$('confirm-text').textContent=text;$('confirm-yes').textContent=yes;d.returnValue='';
      const done=()=>{d.removeEventListener('close',done);asking=false;resolve(d.returnValue==='yes');};
      d.addEventListener('close',done);d.showModal();$('confirm-yes').focus();
    });
  }
  $('confirm-yes').onclick=()=>$('confirm').close('yes');$('confirm-no').onclick=()=>$('confirm').close('no');
  function chest(x,y,invalid=false){return `<g class="treasure-chest ${invalid?'wrong-chest':''}" role="img" aria-label="${invalid?'Aarrearkku, väärä ruutu':'Aarrearkku'}" transform="translate(${x},${y}) scale(.8)"><path d="M-23 0v-9Q-23-23-9-23h18Q23-23 23-9v9Z" fill="#b97832" stroke="#50351e" stroke-width="2.5"/><rect x="-23" y="-2" width="46" height="25" rx="3" fill="#8a4d24" stroke="#50351e" stroke-width="2.5"/><path d="M-14-21v42M14-21v42M-23-2h46" stroke="#f5ce61" stroke-width="4"/><rect x="-5" y="-6" width="10" height="13" rx="2" fill="#ffdd71" stroke="#50351e" stroke-width="1.5"/>${invalid?'<g class="wrong-answer-mark" aria-hidden="true"><path d="M-23-24L23 24M23-24L-23 24" stroke="#fff" stroke-width="8" stroke-linecap="round"/><path d="M-23-24L23 24M23-24L-23 24" stroke="#d32632" stroke-width="5" stroke-linecap="round"/></g>':''}</g>`;}
  function draw(){
    if(!round)return;
    document.body.classList.toggle('addition-running',phase==='running'&&task().kind==='addition');
    const R=32,W=Math.sqrt(3)*R;
    const overlays=[];const framed=selected??lastSelected;
    const cellsSvg=Game.cells.map(c=>{
      const x=12+W/2+c.c*W+(c.r%2)*W/2,y=12+R+c.r*R*1.5;
      const points=Array.from({length:6},(_,i)=>{const a=(-90+i*60)*Math.PI/180;return `${x+R*Math.cos(a)},${y+R*Math.sin(a)}`;}).join(' ');
      const m=round.landmarks.find(m=>m.id===c.id),label=m?`${m.color?'valkoinen':'musta'} ${['kolmio','neliö','risti','ympyrä'][m.s]}`:'';
      const interactive=phase==='running'&&task().kind==='disappearance';
      if(framed===c.id)overlays.push(`<polygon class="hl hl-selected" points="${points}"/>`);
      if(phase==='ended'&&task().target===c.id)overlays.push(`<polygon class="hl hl-answer" points="${points}"/>`);
      const additionId=phase==='ended'?task().addedMarker?.id:addedCell;
      if(task().kind==='addition'&&additionId===c.id)overlays.push(`<g class="added-marker" transform="translate(${x},${y-1})"><circle r="25" fill="#fff9" stroke="#b34c12" stroke-width="2.5" stroke-dasharray="4 3"/>${Game.markerShape(task().addedMarker.s,task().addedMarker.color)}<text x="16" y="-17" font-size="20" font-weight="900" fill="#b34c12">+</text></g>`);
      return `<g><polygon class="cell ${framed===c.id?'selected':''} ${phase==='ended'&&task().target===c.id?'answer':''}" data-id="${c.id}" points="${points}" fill="${Game.colors[round.terrain[c.id]]}" role="button" tabindex="0" aria-label="Arvaa ${coord(c.id)}, ${Game.terrains[round.terrain[c.id]]}${m?', '+label:''}"/>${m?`<g class="map-marker ${mutedMarker===m.id?'muted':''}" data-marker="${m.id}" data-shape="${m.s}" data-color="${m.color}" transform="translate(${x},${y-1})" ${interactive?`role="button" tabindex="0" aria-pressed="${mutedMarker===m.id}" aria-label="${placing==='treasure'?'Aseta arkku':'Merkitse poistettavaksi'}: ${label}, ${coord(m.id)}"`:''}><circle class="marker-hit" r="24"/><g class="marker-art">${Game.markerShape(m.s,m.color)}</g></g>`:''}<text class="coordinate" x="${x}" y="${y+26}" text-anchor="middle" font-size="8.5" font-weight="600" fill="${round.terrain[c.id]===0?'#fff':'#14211b'}">${coord(c.id)}</text>${(phase==='ended'?task().target===c.id:phase==='running'&&selected===c.id)?chest(x,y-1,phase==='running'&&rejectedCell===c.id):''}</g>`;
    }).join('');
    $('board').innerHTML=cellsSvg+`<g class="highlights" aria-hidden="true">${overlays.join('')}</g>`;
    document.body.classList.toggle('harha-running',phase==='running'&&task().kind==='disappearance');
    if(phase==='running'&&task().kind==='disappearance'){
      $('board').querySelectorAll('.cell').forEach(el=>activate(el,()=>selectCell(+el.dataset.id)));
      $('board').querySelectorAll('[data-marker]').forEach(el=>activate(el,()=>selectCell(+el.dataset.marker)));
    }else $('board').querySelectorAll('.cell').forEach(el=>activate(el,()=>selectCell(+el.dataset.id)));

  }
  function activate(el,fn){el.onclick=e=>{e.stopPropagation();fn();};el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();fn();}};}
  function drawClues(){
    $('clues').innerHTML=task().clueIds.map(id=>{
      const clue=Expeditions.catalog[id-1],description=Game.describe(clue.rule);
      const clickable=phase==='running'&&task().kind==='skull';
      return `<article class="clue ${mutedClue===id?'muted':''}" data-clue="${id}" ${clickable?`role="button" tabindex="0" aria-pressed="${mutedClue===id}" aria-label="Merkitse vääräksi vihje ${id}"`:''}><small>VIHJE ${String(id).padStart(2,'0')}</small><div class="formula">${description.html}</div><p>${clue.text}</p></article>`;
    }).join('');
    if(phase==='running'&&task().kind==='skull')$('clues').querySelectorAll('[data-clue]').forEach(el=>activate(el,()=>{
      mutedClue=mutedClue===+el.dataset.clue?null:+el.dataset.clue;

      drawClues();checkAnswer();
    }));
  }
  function progress(){
    $('progress').innerHTML=round.tasks.map((t,i)=>`<button type="button" data-trip="${i}" class="step ${i===index?'active':completed.has(i)?'done':''}" ${i===index?'aria-current="step"':''} aria-label="${titles[t.kind]}, ${i+1} / 6">${t.kind==='normal'?i+1:t.kind==='skull'?skull:`<strong class="cross-icon">${t.kind==='addition'?'?':'×'}</strong>`}</button>`).join('');
    $('progress').querySelectorAll('[data-trip]').forEach(el=>el.onclick=()=>{
      if(asking||phase==='loading')return;
      const destination=+el.dataset.trip;if(destination===index)return;
      index=destination;prepare();
    });
  }
  function additionControls(){
    $('addition-controls').hidden=phase!=='running'||!['addition','disappearance'].includes(task().kind);
    if(!['addition','disappearance'].includes(task().kind))return;
    $('place-marker').innerHTML=task().kind==='disappearance'?'× Poista kuvio':`+ ${Game.marker(task().addedMarker.s,task().addedMarker.color)} ?`;
    $('place-marker').setAttribute('aria-label',task().kind==='disappearance'?'Merkitse poistettava kuvio':`Sijoita ${markerName(task().addedMarker)}`);
    $('place-marker').setAttribute('aria-pressed',placing==='marker');
    $('place-chest').setAttribute('aria-pressed',placing==='treasure');
  }
  function prepare(){
    phase='ready';selected=null;lastSelected=null;rejectedCell=null;mutedClue=null;mutedMarker=null;addedCell=null;placing='marker';elapsed=0;wrong=0;
    document.body.classList.add('awaiting-start');document.body.classList.remove('harha-running','ended');
    $('timer').textContent='00:00';$('task-title').textContent=`${titles[task().kind]} ${index+1} / 6`;
    $('round-label').textContent=`KIERROS ${roundNumber}`;$('code').textContent=`F02 · ${round.seed.toString(36).toUpperCase()}`;
    $('task-rule').textContent=prompts[task().kind];
    $('feedback').textContent='';
    $('state').textContent='';$('start').hidden=false;$('start').disabled=false;$('next').hidden=true;$('reveal').disabled=true;$('reveal').hidden=true;
    $('new').disabled=false;progress();additionControls();drawClues();draw();
  }
  function end(message){
    elapsed=phase==='running'?Date.now()-started:0;phase='ended';totalWrong+=wrong;completed.add(index);progress();document.body.classList.add('ended');
    if(task().kind==='skull')mutedClue=task().wrongClueId;
    if(task().kind==='disappearance')mutedMarker=task().removedMarkerId;
    document.body.classList.remove('awaiting-start');$('feedback').textContent=message;
    $('state').textContent=completed.size===6?`Kierros valmis! Vääriä arvauksia: ${totalWrong}.`:`Vääriä arvauksia: ${wrong}.`;
    $('start').hidden=true;$('next').hidden=false;$('next').textContent=index===5?'Uusi kierros ↗':'Seuraava retki →';$('reveal').disabled=true;$('reveal').hidden=true;
    additionControls();drawClues();draw();
  }
  function answerText(){return `Aarre: ${coord(task().target)}.${task().kind==='skull'?` Väärä vihje: ${task().wrongClueId}.`:task().kind==='disappearance'?` Poistettava kuvio: ${coord(task().removedMarkerId)}.`:task().kind==='addition'?` Lisättävä ${markerName(task().addedMarker)}: ${coord(task().addedMarker.id)}.`:''}`;}
  function selectCell(id){
    if(phase!=='running')return;
    if(task().kind==='disappearance'&&placing==='marker'){
      if(!round.landmarks.some(m=>m.id===id)){$('feedback').textContent='Valitse kuviomerkki tai Arkku-painike.';return;}
      if(id===selected){$('feedback').textContent='Arkku ja poistettava kuvio tarvitsevat eri ruudut.';return;}
      mutedMarker=mutedMarker===id?null:id;placing='treasure';additionControls();draw();checkAnswer();return;
    }
    if(task().kind==='addition'&&placing==='marker'){
      if(round.landmarks.some(m=>m.id===id)||selected===id){$('feedback').textContent='Lisää kuvio ruutuun, jossa ei ole kuviota eikä arkkua.';return;}
      addedCell=addedCell===id?null:id;placing='treasure';additionControls();draw();checkAnswer();return;
    }
    if(task().kind==='addition'&&id===addedCell){$('feedback').textContent='Arkku ja lisättävä kuvio tarvitsevat eri ruudut.';return;}
    if(task().kind==='disappearance'&&id===mutedMarker){$('feedback').textContent='Arkku ei voi olla poistettavan kuvion ruudussa. Valitse toinen aarteen ruutu tai poistettava kuvio.';return;}
    selected=id;lastSelected=id;if(rejectedCell!==id)rejectedCell=null;if(task().kind==='addition'&&addedCell===null||task().kind==='disappearance'&&mutedMarker===null){placing='marker';additionControls();}draw();checkAnswer();
  }
  async function checkAnswer(){
    if(phase!=='running'||asking)return;
    if(selected===null){$('feedback').textContent='Merkintä tallennettu. Valitse seuraavaksi aarteen ruutu.';return;}
    if(task().kind==='skull'&&mutedClue===null){$('feedback').textContent=`Arkku valittu ruutuun ${coord(selected)}. Merkitse vielä yksi vihje vääräksi.`;return;}
    if(task().kind==='disappearance'&&mutedMarker===null){$('feedback').textContent=`Arkku valittu ruutuun ${coord(selected)}. Merkitse vielä poistettava kuvio toisesta ruudusta.`;return;}
    if(task().kind==='disappearance'&&selected===mutedMarker){$('feedback').textContent='Arkku ja poistettava kuvio eivät saa olla samassa ruudussa.';return;}
    if(task().kind==='addition'&&addedCell===null){$('feedback').textContent='Valitse vielä lisättävän kuvion ruutu.';return;}
    const extra=task().kind==='skull'?` ja vihjettä ${mutedClue} vääräksi`:task().kind==='disappearance'?` ja poistettavaksi kuviota ruudussa ${coord(mutedMarker)}`:task().kind==='addition'?` ja lisättävää kuviota ruutuun ${coord(addedCell)}`:'';
    const sure=await ask(`Arvaatko aarretta ruutuun ${coord(selected)}${extra}?`,'Arvaa');
    if(phase!=='running')return;
    if(!sure){
      selected=null;rejectedCell=null;mutedClue=null;mutedMarker=null;addedCell=null;placing='marker';additionControls();
      $('feedback').textContent='Arvaus peruttu. Valitse uusi vastaus.';
      drawClues();draw();return;
    }
    const correct=selected===task().target&&(task().kind!=='skull'||mutedClue===task().wrongClueId)&&(task().kind!=='disappearance'||mutedMarker===task().removedMarkerId&&selected!==mutedMarker)&&(task().kind!=='addition'||addedCell===task().addedMarker.id);
    if(correct)end(`✧ ${answerText()}`);
    else{wrong++;rejectedCell=selected!==task().target?selected:null;draw();$('feedback').textContent=task().kind==='addition'?'Väärä vastaus. Tarkista arkku ja lisätty kuvio.':`Vastaus ei ole oikein. Tarkistakaa aarteen ruutu${task().kind==='normal'?'':task().kind==='skull'?' ja vääräksi merkitty vihje':task().kind==='addition'?' ja lisätyn kuvion paikka':' ja poistettavaksi merkitty kuvio'}. Jatkakaa etsintää!`;}
  }
  async function generate(seed){
    if(typeof Worker==='undefined'||location.protocol==='file:')return new Promise(resolve=>setTimeout(()=>resolve(Expeditions.generate(seed)),25));
    return new Promise(resolve=>{
      const worker=new Worker('round-worker.js?v=rounds18');let settled=false;
      const done=value=>{if(settled)return;settled=true;clearTimeout(timeout);worker.terminate();resolve(value);};
      const fallback=()=>done(Expeditions.generate(seed));
      const timeout=setTimeout(fallback,10000);
      worker.onmessage=e=>e.data.round?done(e.data.round):fallback();worker.onerror=fallback;worker.postMessage({seed});
    });
  }
  async function fresh(){
    const token=++request,previous=round?JSON.stringify(round.landmarks):null;phase='loading';
    $('addition-controls').hidden=true;
    document.body.classList.add('loading','awaiting-start');document.body.classList.remove('harha-running');
    $('new').disabled=true;$('start').disabled=true;$('next').hidden=true;$('reveal').disabled=true;$('reveal').hidden=true;
    $('feedback').textContent='Arvotaan uutta asetelmaa ja kuutta yksikäsitteistä tehtävää…';
    try{
      let seed=crypto.getRandomValues(new Uint32Array(1))[0],next=await generate(seed);
      if(JSON.stringify(next.landmarks)===previous)next=await generate((seed+1)>>>0);
      if(token!==request)return;Expeditions.validate(next);round=next;index=0;roundNumber++;totalWrong=0;completed.clear();
      document.body.classList.remove('loading');prepare();
    }catch(error){if(token!==request)return;document.body.classList.remove('loading');$('new').disabled=false;$('feedback').textContent=`Kierroksen luonti ei onnistunut: ${error.message}. Paina Uusi kierros.`;}
  }
  $('start').onclick=()=>{
    if(phase!=='ready')return;phase='running';started=Date.now();document.body.classList.remove('awaiting-start');$('start').disabled=true;$('start').hidden=true;
    $('feedback').textContent='';$('reveal').hidden=false;$('reveal').disabled=false;
    $('state').textContent='';additionControls();drawClues();draw();
  };
  $('place-marker').onclick=()=>{placing='marker';additionControls();draw();};
  $('place-chest').onclick=()=>{placing='treasure';additionControls();draw();};
  $('next').onclick=()=>{if(phase!=='ended')return;if(index===5)fresh();else{index++;prepare();}};
  $('new').onclick=async()=>{if(asking)return;if(phase==='running'&&!await ask('Aloitetaanko uusi kierros? Nykyinen kierros keskeytyy.','Aloita uusi'))return;fresh();};
  $('reveal').onclick=async()=>{if(phase!=='running'||asking)return;if(await ask('Paljastetaanko ratkaisu ja päätetäänkö tämä retki?','Paljasta')&&phase==='running')end(answerText());};
  $('explain').onchange=()=>document.body.classList.toggle('no-explain',!$('explain').checked);
  $('help').onclick=()=>$('instructions').showModal();$('close-help').onclick=()=>$('instructions').close();
  $('instructions').onclick=e=>{if(e.target===$('instructions')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}};
  $('terrain-guide').innerHTML=Game.terrains.map((name,i)=>`<span>${Game.terrainSymbol(i)} ${name}</span>`).join('');
  $('arithmetic-guide').innerHTML=['difference','sum'].map(kind=>`<div class="help-arithmetic"><div class="formula">${Game.describe({kind,ref:{kind:'markers',shape:0,color:0},other:{kind:'markers',shape:3,color:1},n:kind==='difference'?1:6}).html}</div></div>`).join('');
  setInterval(()=>{const t=Math.floor((phase==='running'?Date.now()-started:elapsed)/1000);$('timer').textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;},250);
  // Read-only snapshot for independent integration checks; no answer appears in the visible UI.
  window.Aarrejahti={snapshot:()=>({round:structuredClone(round),index,phase,selected,lastSelected,mutedClue,mutedMarker,addedCell,placing,wrong})};
  fresh();
})();
