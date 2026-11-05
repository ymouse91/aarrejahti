/* Six simultaneous-play expeditions on the fixed physical F02 terrain. */
const Expeditions = (() => {
  const G=typeof module!=='undefined'?require('./engine.js'):Game;
  const D=typeof module!=='undefined'?require('./game-data.js'):ExpeditionData;
  // Keep the physical game's 60 clue IDs intact; browser-only arithmetic follows them.
  const catalog=D.catalog.map(c=>({...c}));
  const refs=[0,1,3].flatMap(shape=>[0,1].map(color=>({kind:'markers',shape,color})));
  const arithmetic=c=>['difference','sum'].includes(c.rule.kind);
  for(let a=0;a<refs.length;a++)for(let b=0;b<refs.length;b++){
    if(a===b)continue;
    for(const n of [1,2,3]){
      const rule={kind:'difference',ref:refs[a],other:refs[b],n};
      catalog.push({id:catalog.length+1,rule,tier:2,family:`relation${Math.min(a,b)}-${Math.max(a,b)}`,...G.describe(rule)});
    }
    if(a<b)for(let n=4;n<=12;n++){
      const rule={kind:'sum',ref:refs[a],other:refs[b],n};
      catalog.push({id:catalog.length+1,rule,tier:2,family:`relation${a}-${b}`,...G.describe(rule)});
    }
  }
  // Longer sums allow the missing marker to be deduced across the full board.
  for(let a=0;a<refs.length;a++)for(let b=a+1;b<refs.length;b++)for(let n=13;n<=24;n++){
    const rule={kind:'sum',ref:refs[a],other:refs[b],n};
    catalog.push({id:catalog.length+1,rule,tier:2,family:`relation${a}-${b}`,...G.describe(rule)});
  }
  const all=Array.from({length:120},(_,i)=>i);
  // Search all (added marker position, treasure position) pairs, not only treasures.
  function addition(board,used,random){
    const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
    const occupied=new Set(board.landmarks.map(m=>m.id));
    const positions=all.filter(i=>!occupied.has(i));
    // Every current rule sees an added marker only through its distance from
    // the treasure. A unique placement therefore needs a singleton distance shell.
    const seeds=all.filter(t=>!used.has(t)).flatMap(target=>positions.filter(pos=>pos!==target&&positions.filter(p=>G.distances[target][p]===G.distances[target][pos]).length===1).map(pos=>({pos,target})));
    for(const ref of shuffle([...refs])){
      if(board.landmarks.some(m=>m.s===ref.shape&&m.color===ref.color))continue;
      const viable=seeds;
      if(!viable.length)continue;
      const relevant=catalog.filter(c=>[c.rule.ref,c.rule.other].some(r=>r?.kind==='markers'&&r.shape===ref.shape&&r.color===ref.color));
      const candidates=catalog.filter(c=>c.id<=60);
      const additions=positions.map(pos=>{const changed={...board,landmarks:[...board.landmarks,{s:ref.shape,color:ref.color,id:pos}]};return {pos,changed,ctx:G.context(changed)};});
      const cache=new Map();
      const pairsFor=c=>{
        if(!cache.has(c.id)){
          const pairs=[];
          const original=G.compile(board,c.rule);
          for(const {pos,changed,ctx} of additions){
            const f=relevant.includes(c)?G.compile(changed,c.rule,ctx):original;
            for(const target of all)if(target!==pos&&f(target))pairs.push(pos*120+target);
          }
          cache.set(c.id,new Set(pairs));
        }return cache.get(c.id);
      };
      for(const {pos,target} of shuffle(viable)){
        if(pos===target||used.has(target))continue;
        const changed={...board,landmarks:[...board.landmarks,{s:ref.shape,color:ref.color,id:pos}]};
        const truth=shuffle(candidates.filter(c=>G.compile(changed,c.rule)(target)));
        const anchors=truth.filter(c=>relevant.includes(c));
        if(!anchors.length)continue;
        let possible=positions;
        for(const c of anchors){const set=pairsFor(c);possible=possible.filter(p=>set.has(p*120+target));}
        if(possible.length!==1)continue;
        let remaining=positions.flatMap(p=>all.filter(t=>t!==p).map(t=>p*120+t)),chosen=[];
        for(let k=0;k<5&&remaining.length>1;k++){
          let best=null,next=null;
          for(const c of truth){
            if(chosen.some(x=>x.family===c.family)||arithmetic(c)&&chosen.some(arithmetic))continue;
            const set=pairsFor(c),reduced=remaining.filter(p=>set.has(p));
            if(reduced.length&&reduced.length<remaining.length&&(!next||reduced.length<next.length)){best=c;next=reduced;}
          }
          if(!best)break;chosen.push(best);remaining=next;
        }
        if(remaining.length!==1||chosen.length<3)continue;
        const original=all.filter(i=>chosen.every(c=>G.compile(board,c.rule)(i)));
        if(original.length!==0)continue;
        // Remove redundant clues, retaining at least three visible clues.
        for(let k=chosen.length-1;k>=0&&chosen.length>3;k--){
          const rest=chosen.filter((_,i)=>i!==k);
          if([...pairsFor(rest[0])].filter(p=>rest.every(c=>pairsFor(c).has(p))).length===1)chosen=rest;
        }
        return {kind:'addition',target,count:chosen.length,clueIds:chosen.map(c=>c.id),addedMarker:{s:ref.shape,color:ref.color,id:pos}};
      }
    }return null;
  }
  function generate(seed){
    let state=seed>>>0;
    const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    const pick=a=>a[Math.floor(random()*a.length)];
    const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
    for(let attempt=0;attempt<64;attempt++){
      const slots=shuffle([...all]),landmarks=[],missing=pick(refs.filter(r=>!(r.shape===0&&r.color===1)&&!(r.shape===1&&r.color===0)));
      for(const s of [0,1,3])for(const color of [0,1]){if(s===missing.shape&&color===missing.color)continue;for(let k=0,n=random()<.55?2:1;k<n;k++)landmarks.push({s,color,id:slots.pop()});}
      if(landmarks.length===6)continue;
      const board={terrain:[...D.terrain],landmarks};
      const sets=catalog.map(c=>{const f=G.compile(board,c.rule);return all.filter(f);});
      const pool=catalog.filter(c=>!c.additionOnly&&sets[c.id-1].length>=5&&sets[c.id-1].length<=115);
      const tasks=[],used=new Set();
      const added=addition(board,used,random);if(!added)continue;used.add(added.target);
      const intersect=(ids,c)=>ids.filter(i=>sets[c.id-1].includes(i));
      for(const [level,count,required] of [[1,3,null],[1,4,null],[2,4,random()<.5?'difference':'sum']]){
        let found=null,budget=3500;
        for(const target of shuffle([...all])){
          if(used.has(target))continue;
          const clues=shuffle(pool.filter(c=>c.tier<=level&&sets[c.id-1].includes(target))).sort((a,b)=>(b.rule.kind===required)-(a.rule.kind===required));
          function search(chosen,remaining,start){
            if(--budget<0)return null;
            if(chosen.length===count){
              if(remaining.length!==1||!chosen.some(c=>c.tier===level)||required&&!chosen.some(c=>c.rule.kind===required))return null;
              if(chosen.some((_,skip)=>chosen.filter((_,j)=>j!==skip).reduce(intersect,all).length===1))return null;
              return chosen;
            }
            for(let i=start;i<clues.length;i++){
              const c=clues[i];if(chosen.some(x=>x.family===c.family)||arithmetic(c)&&chosen.some(arithmetic))continue;
              const next=intersect(remaining,c);
              if(next.length===remaining.length||next.length<(chosen.length===count-1?1:2))continue;
              const result=search([...chosen,c],next,i+1);if(result)return result;if(budget<0)break;
            }return null;
          }
          const result=search([],all,0);if(result){found={kind:'normal',target,count,clueIds:result.map(c=>c.id)};break;}if(budget<0)break;
        }
        if(!found)break;tasks.push(found);used.add(found.target);
      }
      if(tasks.length!==3)continue;
      let skull=null;
      for(let a=0;a<18000&&!skull;a++){
        const target=pick(all);if(used.has(target))continue;
        const truth=pool.filter(c=>sets[c.id-1].includes(target)),chosen=[];
        for(let k=0;k<4;k++){const eligible=truth.filter(c=>!chosen.some(x=>x.family===c.family)&&(!arithmetic(c)||!chosen.some(arithmetic)));const c=pick(eligible);if(c)chosen.push(c);}
        if(chosen.length!==4||chosen.reduce(intersect,all).length!==1)continue;
        for(const wrong of shuffle(pool.filter(c=>!sets[c.id-1].includes(target)&&!chosen.some(x=>x.family===c.family)&&(!arithmetic(c)||!chosen.some(arithmetic))))){
          const ids=[...chosen.map(c=>c.id),wrong.id];
          const solutions=all.filter(i=>ids.filter(id=>sets[id-1].includes(i)).length===4);
          if(solutions.length===1){skull={kind:'skull',target,count:5,clueIds:shuffle(ids),wrongClueId:wrong.id};break;}
        }
      }
      if(!skull)continue;tasks.push(skull);used.add(skull.target);
      const removals=landmarks.flatMap((m,k)=>{
        if(landmarks.filter(n=>n.s===m.s&&n.color===m.color).length<2)return [];
        const changed={...board,landmarks:landmarks.filter((_,j)=>j!==k)};
        return [{id:m.id,sets:catalog.map(c=>{const f=G.compile(changed,c.rule);return all.filter(f);})}];
      });
      if(!removals.length)continue;
      let removal=null;
      for(let a=0;a<25000&&!removal;a++){
        const r=pick(removals),target=pick(all);if(used.has(target)||target===r.id)continue;
        const truth=pool.filter(c=>r.sets[c.id-1].includes(target));
        const anchors=truth.filter(c=>!sets[c.id-1].includes(target));if(!anchors.length)continue;
        const chosen=[pick(anchors)],count=a%2?4:5;
        while(chosen.length<count){const eligible=truth.filter(c=>!chosen.some(x=>x.family===c.family)&&(!arithmetic(c)||!chosen.some(arithmetic)));const c=pick(eligible);if(!c)break;chosen.push(c);}
        if(chosen.length!==count||chosen.reduce(intersect,all).length)continue;
        let pairs=0;
        for(const other of removals){for(const i of all){if(chosen.every(c=>other.sets[c.id-1].includes(i)))pairs++;if(pairs>1)break;}if(pairs>1)break;}
        if(pairs===1)removal={kind:'disappearance',target,count,clueIds:shuffle(chosen.map(c=>c.id)),removedMarkerId:r.id};
      }
      if(!removal)continue;
      tasks.push(removal);used.add(removal.target);
      tasks.push(added);return {...board,seed,tasks,fallback:false};
    }
    // The validated bank guarantees a complete round even on an unsuccessful bounded search.
    if(D.additionBank?.length){const matching=D.additionBank.filter(r=>r.tasks[5].clueIds.every(id=>id<=60));if(!matching.length)throw Error('Alkuperäisillä vihjeillä ei löytynyt Hukkareissua');const saved=pick(matching);return {...JSON.parse(JSON.stringify(saved)),seed,fallback:true};}
    throw Error('Lisäysretkeä ei löytynyt. Arvo uusi kierros.');
  }
  function validate(round){
    if(round.terrain.length!==120||round.tasks.length!==6)throw Error('Virheellinen kierros');
    const solve=(board,ids)=>{const tests=ids.map(id=>G.compile(board,catalog[id-1].rule));return all.filter(i=>tests.every(f=>f(i)));};
    for(const task of round.tasks){
      if(task.kind==='normal'){
        const found=solve(round,task.clueIds);if(found.length!==1||found[0]!==task.target)throw Error('Retki ei ole yksikäsitteinen');
      }else if(task.kind==='skull'){
        const tests=task.clueIds.map(id=>G.compile(round,catalog[id-1].rule));
        const found=all.filter(i=>tests.filter(f=>f(i)).length===task.clueIds.length-1);
        if(found.length!==1||found[0]!==task.target||G.compile(round,catalog[task.wrongClueId-1].rule)(task.target)||solve(round,task.clueIds).length)throw Error('Pääkalloretki ei ole yksikäsitteinen');
      }else if(task.kind==='addition'){
        const m=task.addedMarker,pairs=[];
        if(!m||round.landmarks.some(n=>n.id===m.id)||m.id===task.target)throw Error('Virheellinen lisättävä merkki');
        for(const pos of all.filter(i=>!round.landmarks.some(n=>n.id===i))){
          const found=solve({...round,landmarks:[...round.landmarks,{...m,id:pos}]},task.clueIds);
          pairs.push(...found.filter(i=>i!==pos).map(i=>[pos,i]));
        }
        if(round.landmarks.some(n=>n.s===m.s&&n.color===m.color)||solve(round,task.clueIds).length||pairs.length!==1||pairs[0][0]!==m.id||pairs[0][1]!==task.target)throw Error('Hukkareissu ei ole yksikäsitteinen');
      }else{
        if(task.target===task.removedMarkerId)throw Error('Arkku ei voi olla poistettavan kuvion ruudussa');
        let pairs=[];
        for(const m of round.landmarks){
          const remaining=round.landmarks.filter(n=>n!==m);
          const refs=task.clueIds.flatMap(id=>{const r=catalog[id-1].rule;return [r.ref,r.other].filter(x=>x&&x.kind==='markers');});
          if(refs.some(r=>!remaining.some(n=>n.s===r.shape&&n.color===r.color)))continue;
          pairs.push(...solve({...round,landmarks:remaining},task.clueIds).map(id=>[m.id,id]));
        }
        if(solve(round,task.clueIds).length||pairs.length!==1||pairs[0][0]!==task.removedMarkerId||pairs[0][1]!==task.target)throw Error('Harharetki ei ole yksikäsitteinen');
      }
    }return true;
  }
  return {generate,validate,catalog};
})();
if(typeof module!=='undefined')module.exports=Expeditions;
