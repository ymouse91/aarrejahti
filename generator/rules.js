/* Pure puzzle rules. Each clue carries a serializable rule for validation. */
const Game = (() => {
  const terrains=['Vesi','Metsä','Hiekka','Kallio'],icons=['≈','♣','∴','⌁'],shapes=['△','□','✚','○'];
  const colors=['#2C73B9','#9ACD32','#FFE8A3','#8F8995'],names=['kolmio','neliö','risti','ympyrä'];
  const cells=Array.from({length:120},(_,id)=>{const r=Math.floor(id/12),c=id%12;return {id,r,c,q:c-Math.floor(r/2)};});
  const distance=(a,b)=>(Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;
  const distances=cells.map(a=>cells.map(b=>distance(a,b)));
  const neighbors=cells.map(c=>cells.filter(b=>distance(c,b)===1).map(b=>b.id));
  const edges=cells.filter(c=>neighbors[c.id].length<6).map(c=>c.id);
  function rng(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
  function markerShape(shape,color){
    const attrs=`fill="${color===1?'#ffffff':'#17251f'}" stroke="#17251f" stroke-width="2.2" stroke-linejoin="round"`;
    if(shape===0)return `<path d="M0-22 L22 17 L-22 17Z" ${attrs}/>`;
    if(shape===1)return `<rect x="-19" y="-19" width="38" height="38" rx="1" ${attrs}/>`;
    if(shape===2)return `<path d="M-7-22 h14 v15 h15 v14 h-15 v15 h-14 v-15 h-15 v-14 h15Z" ${attrs}/>`;
    return `<circle r="20" ${attrs}/>`;
  }
  const marker=(shape,color)=>`<svg class="clue-marker" viewBox="-26 -26 52 52" role="img" aria-label="${color?'valkoinen':'musta'} ${names[shape]}" data-shape="${shape}" data-color="${color}">${markerShape(shape,color)}</svg>`;
  const bothMarkers=shape=>`<span class="both-markers" title="Molemmat värit">${marker(shape,0)}${marker(shape,1)}</span>`;
  const terrainSymbol=t=>`<svg class="terrain-symbol" viewBox="0 0 48 41.569219" role="img" aria-label="${terrains[t]}" data-terrain="${t}"><title>${terrains[t]}</title><polygon points="12,0 36,0 48,20.7846095 36,41.569219 12,41.569219 0,20.7846095" fill="${colors[t]}"/></svg>`;
  const edgeSymbol='<span class="edge-symbol" role="img" aria-label="Laudan reuna"><svg viewBox="0 0 48 42" aria-hidden="true"><path d="M12 2h24l10 19-10 19H12L2 21Z" fill="none" stroke="#bcc8bd" stroke-width="2"/><path d="M12 2L2 21l10 19" fill="none" stroke="#244c42" stroke-width="5" stroke-linejoin="round"/></svg></span>';
  const neighborhood='<svg class="neighbor-symbol" viewBox="-30 -30 60 60" role="img" aria-label="Viereiset ruudut"><g fill="none" stroke="#244c42" stroke-width="1.8">'+Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return `<circle cx="${20*Math.cos(a)}" cy="${20*Math.sin(a)}" r="8"/>`;}).join('')+'</g><circle r="8" fill="#244c42"/></svg>';
  const refHtml=r=>r.kind==='terrain'?terrainSymbol(r.t):r.kind==='edge'?edgeSymbol:r.color===null?bothMarkers(r.shape):marker(r.shape,r.color);
  const refName=r=>r.kind==='terrain'?`lähin ${terrains[r.t].toLowerCase()}ruutu`:r.kind==='edge'?'lähin reunaruutu':`${r.color===null?'musta tai valkoinen':r.color?'valkoinen':'musta'} ${names[r.shape]}`;
  const groupIds=(board,r)=>r.kind==='edge'?edges:r.kind==='terrain'?cells.filter(c=>board.terrain[c.id]===r.t).map(c=>c.id):board.landmarks.filter(m=>m.s===r.shape&&(r.color===null||m.color===r.color)).map(m=>m.id);
  function context(board){
    const cache=new Map();
    return {group(r){
      const key=JSON.stringify(r);
      if(!cache.has(key)){
        const ids=groupIds(board,r);
        const values=cells.map(c=>r.kind==='markers'?ids.map(id=>distances[c.id][id]):[Math.min(...ids.map(id=>distances[c.id][id]))]);
        cache.set(key,{ids,values});
      }
      return cache.get(key);
    }};
  }
  function compile(board,rule,ctx=context(board)){
    const r=rule,group=r.ref?ctx.group(r.ref):null,other=r.other?ctx.group(r.other):null;
    const compare=(v,n)=>r.op==='le'?v<=n:r.op==='gt'?v>n:v===n;
    const universal=(id,fn)=>group.ids.length>0&&group.values[id].every(fn);
    switch(r.kind){
      case 'terrain': return id=>(board.terrain[id]===r.t)!==r.negate;
      case 'distance': return id=>universal(id,d=>compare(d,r.n));
      case 'range': return id=>universal(id,d=>d>=r.lo&&d<=r.hi);
      case 'neighbor': return id=>{const n=neighbors[id].filter(j=>board.terrain[j]===r.t).length;return r.op==='exists'?n>0:n===r.n;};
      case 'boundary': return id=>neighbors[id].some(j=>board.terrain[j]===r.a)&&neighbors[id].some(j=>board.terrain[j]===r.b);
      case 'diversity': return id=>new Set(neighbors[id].map(j=>board.terrain[j])).size===r.n;
      case 'nearby': return id=>group.ids.filter(j=>distances[id][j]<=r.radius).length===r.n;
      case 'equal': return id=>universal(id,a=>other.ids.length>0&&other.values[id].every(b=>a===b));
      case 'closer': return id=>universal(id,a=>other.ids.length>0&&other.values[id].every(b=>a<b));
      case 'difference': return id=>universal(id,a=>other.ids.length>0&&other.values[id].every(b=>a+r.n===b));
      case 'sum': return id=>universal(id,a=>other.ids.length>0&&other.values[id].every(b=>a+b===r.n));
      case 'path': return id=>group.ids.length>0&&other.ids.length>0&&group.ids.every(a=>other.ids.every(b=>distances[a][id]+distances[id][b]===distances[a][b]));
      default: throw Error('Tuntematon vihjetyyppi: '+r.kind);
    }
  }
  function nearbyText(r){
    const steps=['nollan','yhden','kahden','kolmen','neljän','viiden','kuuden','seitsemän'];
    const amounts=['nolla','yksi','kaksi','kolme'];
    const partitive=['kolmiota','neliötä','ristiä','ympyrää'];
    const singular=r.n===1,shape=singular?names[r.ref.shape]:partitive[r.ref.shape];
    const color=r.ref.color===null?'':r.ref.color===1?(singular?'valkoinen ':'valkoista '):(singular?'musta ':'mustaa ');
    return `Enintään ${steps[r.radius]||r.radius} askeleen päässä aarteesta on tasan ${amounts[r.n]||r.n} ${color}${shape}${r.ref.color===null?', väristä riippumatta':''}. Myös aarteen omassa ruudussa oleva ${names[r.ref.shape]} lasketaan mukaan.`;
  }
  function describe(r){
    const h=r.ref?refHtml(r.ref):'',o=r.other?refHtml(r.other):'',n=r.ref?refName(r.ref):'',m=r.other?refName(r.other):'';
    const targetForms=['kolmioon','neliöön','ristiin','ympyrään'];
    const stepGenitive=['nollan','yhden','kahden','kolmen','neljän','viiden','kuuden','seitsemän','kahdeksan','yhdeksän','kymmenen'];
    const distanceText=r.ref?.kind==='markers'?`Jokaiseen ${r.ref.color===null?'mustaan tai valkoiseen':r.ref.color?'valkoiseen':'mustaan'} ${targetForms[r.ref.shape]}`:n.charAt(0).toUpperCase()+n.slice(1);
    switch(r.kind){
      case 'terrain':return {html:`${r.negate?'∉':'∈'} ${terrainSymbol(r.t)}`,text:`Aarre ${r.negate?'ei ole':'on'} maastossa ${terrains[r.t].toLowerCase()}.`};
      case 'distance':return {html:`↔ ${h} ${{le:'≤',gt:'>',eq:'='}[r.op]} ${r.n}`,text:r.ref.kind==='markers'?`${distanceText} on ${r.op==='le'?'enintään':r.op==='gt'?'yli':'tasan'} ${r.n} askelta.`:`${distanceText} on ${r.op==='le'?'enintään':r.op==='gt'?'yli':'tasan'} ${stepGenitive[r.n]||r.n} askeleen päässä.`};
      case 'range':return {html:`${r.lo} ≤ ↔ ${h} ≤ ${r.hi}`,text:r.ref.kind==='markers'?`${distanceText} on ${r.lo}–${r.hi} askelta.`:`${distanceText} on ${r.lo}–${r.hi} askeleen päässä.`};
      case 'neighbor':return {html:`${neighborhood} ${terrainSymbol(r.t)} ${r.op==='exists'?'≥ 1':'= '+r.n}`,text:r.op==='exists'?`Ainakin yksi viereinen ruutu on maastoa ${terrains[r.t].toLowerCase()}.`:`Viereisistä ruuduista tasan ${r.n} on maastoa ${terrains[r.t].toLowerCase()}.`};
      case 'boundary':return {html:`${neighborhood} ${terrainSymbol(r.a)} + ${terrainSymbol(r.b)}`,text:`Viereisissä ruuduissa on sekä maastoa ${terrains[r.a].toLowerCase()} että ${terrains[r.b].toLowerCase()}.`};
      case 'diversity':return {html:`${neighborhood} <span class="formula-word">värit</span> = ${r.n}`,text:`Viereisissä ruuduissa esiintyy tasan ${r.n} eri maastotyyppiä.`};
      case 'nearby':return {html:`#(${h}, ↔ ≤ ${r.radius}) = ${r.n}`,text:nearbyText(r)};
      case 'equal':return {html:`↔ ${h} = ↔ ${o}`,text:`Aarre on yhtä kaukana kaikista näistä kuvioista: ${n} ja ${m}.`};
      case 'closer':return {html:`↔ ${h} < ↔ ${o}`,text:`Jokainen kuvio (${n}) on lähempänä kuin mikään kuvio (${m}).`};
      case 'difference':return {html:`↔ ${h} + ${r.n} = ↔ ${o}`,text:`Kuvioon (${m}) on ${r.n} askelta enemmän kuin kuvioon (${n}). Ehto koskee jokaista ryhmien välistä paria.`};
      case 'sum':return {html:`↔ ${h} + ↔ ${o} = ${r.n}`,text:`Etäisyydet kuvioihin (${n}) ja (${m}) ovat yhteensä ${r.n}. Ehto koskee jokaista ryhmien välistä paria.`};
      case 'path':return {html:`${h} — ✧ — ${o}`,text:`Aarre on jollakin lyhimmällä reitillä kuvioiden (${n}) ja (${m}) välillä. Ehto koskee jokaista ryhmien välistä paria.`};
    }
  }
  function candidates(board,level,target){
    const list=[],ctx=context(board),refs=terrains.map((_,t)=>({kind:'terrain',t})),colored=[];
    for(let shape=0;shape<4;shape++)for(let color=0;color<2;color++)if(board.landmarks.some(m=>m.s===shape&&m.color===color))colored.push({kind:'markers',shape,color});
    refs.push(...colored);
    for(let shape=0;shape<4;shape++)if(board.landmarks.some(m=>m.s===shape))refs.push({kind:'markers',shape,color:null});
    refs.push({kind:'edge'});
    function add(rule,tier,family){
      if(tier>level)return;
      const test=compile(board,rule,ctx);if(target!==undefined&&!test(target))return;
      const ids=cells.filter(c=>test(c.id)).map(c=>c.id);
      if(ids.length<9||ids.length>110)return;
      list.push({...describe(rule),rule,tier,family,ids});
    }
    for(let t=0;t<4;t++)for(const negate of [false,true])add({kind:'terrain',t,negate},1,'terrain');
    refs.forEach((ref,k)=>{
      for(let n=0;n<=7;n++)for(const op of ['le','gt','eq']){
        if(n===0&&op==='le')continue; // Zero distance is expressed as exactly zero.
        add({kind:'distance',ref,op,n},1,'ref'+k);
      }
      if(level>=2)for(let lo=1;lo<=3;lo++)for(let hi=lo+1;hi<=lo+3;hi++)add({kind:'range',ref,lo,hi},2,'ref'+k);
      if(level>=3&&ref.kind==='markers')for(let radius=1;radius<=3;radius++)for(let n=1;n<=3;n++)add({kind:'nearby',ref,radius,n},3,'near'+k);
    });
    if(level>=2){
      for(let t=0;t<4;t++){
        add({kind:'neighbor',t,op:'exists'},2,'neighbor'+t);
        for(let n=0;n<=5;n++)add({kind:'neighbor',t,op:'eq',n},2,'neighbor'+t);
        for(let b=t+1;b<4;b++)add({kind:'boundary',a:t,b},2,'boundary');
      }
      for(let a=0;a<colored.length;a++)for(let b=a+1;b<colored.length;b++){
        const ref=colored[a],other=colored[b],family=`pair${a}-${b}`;
        add({kind:'equal',ref,other},2,family);
        add({kind:'closer',ref,other},2,family);add({kind:'closer',ref:other,other:ref},2,family);
        if(level===3){
          for(let n=1;n<=3;n++){add({kind:'difference',ref,other,n},3,family);add({kind:'difference',ref:other,other:ref,n},3,family);}
          for(let n=4;n<=16;n++)add({kind:'sum',ref,other,n},3,family);
          add({kind:'path',ref,other},3,family);
        }
      }
    }
    if(level===3)for(let n=1;n<=4;n++)add({kind:'diversity',n},3,'diversity');
    return list;
  }
  function assemble(modules,order){
    if(order.length!==4||new Set(order).size!==4)throw Error('Virheellinen moduulijärjestys');
    return cells.map(c=>{const slot=(c.r>=5?2:0)+(c.c>=6?1:0),r=c.r%5,col=c.c%6;return modules[order[slot]-1].terrain[slot<2?r*6+col:(4-r)*6+(5-col)];});
  }
  function generate(seed,count,level,modules,target,preferred){
    const random=rng(seed),shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
    for(let attempt=0;attempt<180;attempt++){
      const order=shuffle([1,2,3,4]),terrain=assemble(modules,order),available=[...cells],landmarks=[];
      const active=shuffle([0,1,2,3,6,7]).slice(0,4+Math.floor(random()*3));
      active.forEach((type,k)=>{const copies=k===0?2:1+Math.floor(random()*2);for(let n=0;n<copies;n++){const j=Math.floor(random()*available.length);landmarks.push({s:Math.floor(type/2),color:type%2,id:available.splice(j,1)[0].id});}});
      const board={terrain,landmarks},pool=shuffle(candidates(board,level,target));
      let anchors=pool.filter(c=>c.tier===level);if(preferred)anchors.sort((a,b)=>(b.rule.kind===preferred)-(a.rule.kind===preferred));
      const intersect=(ids,c)=>ids.filter(id=>c.ids.includes(id));let budget=16000;
      function search(chosen,remaining,start){
        if(--budget<0)return null;
        if(chosen.length===count){if(remaining.length!==1)return null;if(chosen.some((_,skip)=>chosen.filter((_,i)=>i!==skip).reduce(intersect,cells.map(c=>c.id)).length===1))return null;return chosen;}
        for(let k=start;k<pool.length;k++){
          const clue=pool[k];if(chosen.some(c=>c.family===clue.family))continue;const next=intersect(remaining,clue);
          if(next.length===remaining.length||next.length<(chosen.length===count-1?1:2))continue;
          const result=search([...chosen,clue],next,k+1);if(result)return result;if(budget<0)break;
        }return null;
      }
      for(const anchor of anchors){const clues=search([anchor],anchor.ids,0);if(clues)return {seed,count,level,order,terrain,landmarks,clues:shuffle(clues),target};if(budget<0)break;}
    }throw Error('Tehtävän luonti epäonnistui');
  }
  return {generate,assemble,candidates,compile,describe,cells,distances,neighbors,edges,terrains,icons,colors,shapes,marker,markerShape,terrainSymbol,neighborhood,refHtml};
})();
if(typeof module!=='undefined')module.exports=Game;
