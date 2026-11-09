/* D1 defaults, identical to the physical game's Excel work model. */
const CardDifficulty=(()=>{
 const G=typeof module!=='undefined'?require('./rules.js'):Game;
 const data=typeof module!=='undefined'?require('./data.js'):CardData;
 function price(board,r){
  const n=ref=>board.landmarks.filter(m=>m.s===ref.shape&&m.color===ref.color).length;
  if(r.kind==='terrain')return 1;
  if(r.kind==='neighbor')return 3;
  if(r.kind==='boundary')return 4;
  if(['distance','range'].includes(r.kind)){
   const v=r.ref.kind==='markers'?2*n(r.ref):r.ref.kind==='edge'?2:3;
   return v+(r.kind==='range'?.5*(r.ref.kind==='markers'?n(r.ref):1):0);
  }
  const a=n(r.ref),b=n(r.other);
  return 2*(a+b)+.5*a*b+(r.kind==='difference'?a*b:0);
 }
 function scoreTask(board,task){
  const ids=task.clueIds,rules=ids.map(id=>data.catalog[id-1].rule),kind=task.kind||'normal';
  const removals=board.landmarks.filter(m=>board.landmarks.filter(n=>n.s===m.s&&n.color===m.color).length>1);
  const variants=new Map(removals.map(m=>[m.id,{...board,landmarks:board.landmarks.filter(n=>n!==m)}]));
  const states=[];
  for(let cell=0;cell<120;cell++){
   if(kind==='normal')states.push([cell,null]);
   else if(kind==='skull')for(const id of ids)states.push([cell,id]);
   else for(const m of removals)if(cell!==m.id)states.push([cell,m.id]);
  }
  const truth=[],keys=[],costs=[];
  rules.forEach((r,j)=>{
   const original=G.compile(board,r),changed=new Map([...variants].map(([id,b])=>[id,G.compile(b,r)]));
   truth[j]=[];keys[j]=[];costs[j]=new Map();
   states.forEach(([cell,h],s)=>{
    const b=kind==='disappearance'?variants.get(h):board;
    const raw=kind==='disappearance'?changed.get(h)(cell):original(cell);
    truth[j][s]=raw!==(kind==='skull'&&h===ids[j]);
    const marker=kind==='disappearance'?board.landmarks.find(m=>m.id===h):null;
    const affected=marker&&[r.ref,r.other].some(ref=>ref?.kind==='markers'&&ref.shape===marker.s&&ref.color===marker.color);
    const key=cell+(affected?(h+1)*120:0);
    keys[j][s]=key;costs[j].set(key,price(b,r));
   });
  });
  const values=[];let bestOrder=null,best=Infinity;
  function walk(order,remaining,work){
   if(order.length===ids.length){
    if(remaining.length!==1||states[remaining[0]][0]!==task.target)throw Error('Ratkaisu ei ole yksikäsitteinen.');
    const h=states[remaining[0]][1];
    if(kind==='skull'&&h!==task.wrongClueId||kind==='disappearance'&&h!==task.removedMarkerId)throw Error('Virheellinen erikoisretki.');
    values.push(work);if(work<best){best=work;bestOrder=order.map(j=>ids[j])}return;
   }
   for(let j=0;j<ids.length;j++)if(!order.includes(j)){
    let cost=0;for(const key of new Set(remaining.map(s=>keys[j][s])))cost+=costs[j].get(key);
    if(kind!=='normal')cost+=.25*remaining.length;
    walk([...order,j],remaining.filter(s=>truth[j][s]),work+cost);
   }
  }
  walk([],states.map((_,i)=>i),0);
  const good=values.filter(v=>v<=best*1.2+1e-9).length;
  return {score:best*(1+.25*(1-good/values.length)),bestWork:best,bestOrder};
 }
 function score(card){
  const tasks=card.tasks.map(t=>({...t,difficulty:scoreTask(card,t)}));
  const normal=tasks.slice(0,4).sort((a,b)=>a.difficulty.score-b.difficulty.score);
  card={...card,tasks:[...normal,tasks.find(t=>t.kind==='disappearance'),tasks.find(t=>t.kind==='skull')].map((t,i)=>({...t,id:i+1}))};
  card.score=card.tasks.reduce((sum,t)=>sum+t.difficulty.score,0);
  card.name=String(Math.round(card.score));card.model='D1';
  return card;
 }
 function clueUsageValid(card){
  const counts=new Map();
  for(let i=0;i<card.tasks.length;i++){
   const ids=card.tasks[i].clueIds;
   if(new Set(ids).size!==ids.length)return false;
   if(i&&ids.some(n=>card.tasks[i-1].clueIds.includes(n)))return false;
   for(const n of ids){const count=(counts.get(n)||0)+1;if(count>2)return false;counts.set(n,count)}
  }
  return true;
 }
 return {score,scoreTask,price,clueUsageValid};
})();
if(typeof module!=='undefined')module.exports=CardDifficulty;
