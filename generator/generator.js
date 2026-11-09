/* Standalone physical-game generator. All 68 IDs are eligible. */
const CardGenerator=(()=>{
const G=typeof module!=='undefined'?require('./rules.js'):Game;
const data=typeof module!=='undefined'?require('./data.js'):CardData;
function generate(seed,progress=()=>{}){
const difficulty=typeof module!=='undefined'?require('./difficulty.js'):CardDifficulty;
const catalog=data.catalog;
const active=catalog,all=Array.from({length:120},(_,i)=>i),FULL=(1n<<120n)-1n;
let state=seed>>>0;const rand=n=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return Math.floor(state/4294967296*n)};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=rand(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const coord=i=>String.fromCharCode(65+i%12)+(1+Math.floor(i/12));
const keyable=all.filter(i=>data.solutionGrid.includes(coord(i)));
const bit=i=>1n<<BigInt(i),pop=x=>{let n=0;while(x){x&=x-1n;n++}return n};
const use=Object.fromEntries(active.map(c=>[c.id,0]));
const refs=[0,1,3].flatMap(shape=>[0,1].map(color=>({shape,color})));
function masks(board){return catalog.map(c=>{const f=G.compile(board,c.rule);return all.reduce((m,i)=>f(i)?m|bit(i):m,0n)})}
function duplicateCost(board,c){return [c.rule.ref,c.rule.other].filter(r=>r?.kind==='markers'&&board.landmarks.filter(m=>m.s===r.shape&&m.color===r.color).length>1).length}
function key(value){const k=data.solutionGrid.indexOf(value);if(k<0)throw Error('Vastaukselle ei ole ratkaisukortin koodia.');return String.fromCharCode(65+Math.floor(k/20))+(k%20+1)}
function keyed(task,target,prefix='key'){task[prefix]=key(coord(target))}
function search(pool,ms,target,count,initial,required,accept,maxNodes=3500){
 const targetBit=bit(target);let budget=maxNodes;
 pool=shuffle(pool).sort((a,b)=>(use[a.id]||0)-(use[b.id]||0));
 const chosen=required?[required]:[];if(required&&!pool.includes(required))return null;
 function dfs(start,remain){
  if(--budget<0)return null;
  if(chosen.length===count){if(remain!==targetBit||!accept(chosen))return null;
   if(chosen.some((_,k)=>chosen.filter((_,j)=>j!==k).reduce((m,c)=>m&ms[c.id-1],initial)===targetBit))return null;
   return [...chosen];}
  if(remain===targetBit)return null;
  for(let j=start;j<pool.length;j++){const c=pool[j];if(chosen.some(q=>q.family===c.family))continue;const next=remain&ms[c.id-1];if(next===remain||!(next&targetBit))continue;
   chosen.push(c);const r=dfs(j+1,next);chosen.pop();if(r)return r;if(budget<0)return null;}
  return null;
 }
 return dfs(0,required?initial&ms[required.id-1]:initial);
}
function normal(board,ms,index,used,anchor){
 const count=[3,4,3,4][index],limit=index<2?1:index===2?2:3;
 for(const target of shuffle(keyable.filter(t=>!used.has(t))).slice(0,45)){
  const pool=active.filter(c=>c.tier<=limit&&(index!==3||c.tier<3||c.id===anchor)&&pop(ms[c.id-1])>= (c.tier===3?2:5)&&pop(ms[c.id-1])<=115&&(ms[c.id-1]&bit(target))&&(index!==0||duplicateCost(board,c)===0));
  const found=search(pool,ms,target,count,FULL,index===3?catalog[anchor-1]:null,cs=>index===1?cs.filter(c=>duplicateCost(board,c)>0).length<=1:index===2?cs.some(c=>c.tier===2):index===3?cs.some(c=>c.tier===2):true);
  if(found){const t={id:index+1,level:[1,1,2,3][index],count,target,clueIds:found.map(c=>c.id).sort((a,b)=>a-b)};keyed(t,target);return t;}
 }return null;
}
function skull(board,ms,used,required){
 for(let attempt=0;attempt<350;attempt++){
  const target=keyable[rand(keyable.length)];if(used.has(target))continue;
  const pool=active.filter(c=>(ms[c.id-1]&bit(target))&&pop(ms[c.id-1])>=2&&pop(ms[c.id-1])<=115);
  const truth=search(pool,ms,target,4,FULL,required?catalog[required-1]:null,()=>true,1200);if(!truth)continue;
  for(const wrong of shuffle(active.filter(c=>data.solutionGrid.includes(String(c.id).padStart(2,'0'))&&!(ms[c.id-1]&bit(target))&&ms[c.id-1]&&!truth.some(t=>t.family===c.family)))){
   const cs=[...truth,wrong];let candidates=0n;
   for(let k=0;k<5;k++){let v=FULL;for(let j=0;j<5;j++)if(j!==k)v&=ms[cs[j].id-1];v&=FULL^ms[cs[k].id-1];candidates|=v;}
   if(candidates!==bit(target))continue;
   const t={id:5,kind:'skull',level:3,count:5,target,wrongClueId:wrong.id,clueIds:cs.map(c=>c.id).sort((a,b)=>a-b)};keyed(t,target);
   t.wrongKey=key(String(wrong.id).padStart(2,'0'));return t;
  }
 }return null;
}
function removal(board,original,used){
 const removals=board.landmarks.filter(m=>board.landmarks.filter(n=>n.s===m.s&&n.color===m.color).length>1);
 const sets=removals.map(m=>masks({...board,landmarks:board.landmarks.filter(n=>n!==m)}));
 let full=(1n<<BigInt(120*removals.length))-1n;
 removals.forEach((m,k)=>full &= ~bit(k*120+m.id));
 const combined=catalog.map((_,i)=>sets.reduce((m,s,k)=>m|((s[i]&~bit(removals[k].id))<<BigInt(k*120)),0n));
 for(let a=0;a<35;a++){
  if(!removals.length)return null;const k=rand(removals.length),target=keyable[rand(keyable.length)];if(used.has(target)||target===removals[k].id||!keyable.includes(removals[k].id))continue;
  const pair=k*120+target,mask=bit(pair),pool=active.filter(c=>combined[c.id-1]&mask);
  const anchors=shuffle(pool.filter(c=>!(original[c.id-1]&bit(target))));
  for(const anchor of anchors.slice(0,2))for(const count of [4,5]){
   const found=search(pool,combined,pair,count,full,anchor,cs=>cs.reduce((m,c)=>m&original[c.id-1],FULL)===0n,400);
   if(found){const t={id:6,kind:'disappearance',level:3,count,target,removedMarkerId:removals[k].id,clueIds:found.map(c=>c.id).sort((a,b)=>a-b)};keyed(t,target);keyed(t,t.removedMarkerId,'removeKey');return t;}
  }
 }return null;
}
function layout(anchor){
 const clue=catalog[anchor-1],target=keyable[rand(keyable.length)],r=clue.rule;
 const occupied=new Set(),landmarks=[];
 function add(ref,choices){const available=choices.filter(i=>!occupied.has(i));if(!available.length)return false;const id=available[rand(available.length)];occupied.add(id);landmarks.push({s:ref.shape,color:ref.color,id});return true}
 const distance=2+rand(3),delta=r.kind==='difference'?r.n:r.kind==='closer'?1:0;
 if(!add(r.ref,all.filter(i=>G.distances[target][i]===distance))||!add(r.other,all.filter(i=>G.distances[target][i]===distance+delta)))return null;
 for(const ref of refs)if(!landmarks.some(m=>m.s===ref.shape&&m.color===ref.color)){
  add(ref,all);if(rand(2))add(ref,all);
 }
 // At least one duplicated group is necessary for the removal expedition.
 if(landmarks.length===6){const ref=refs.find(q=>q.shape!==r.ref.shape||q.color!==r.ref.color);add(ref,all)}
 return {terrain:data.terrain,landmarks};
}

 for(let attempt=0;attempt<500;attempt++){
  if(attempt%5===0)progress(attempt);
  const anchor=59+rand(10),board=layout(anchor);if(!board)continue;
  const ms=masks(board);if(pop(ms[anchor-1])<4)continue;
  const tasks=[],used=new Set(),fourth=normal(board,ms,3,used,anchor);if(!fourth)continue;used.add(fourth.target);
  let fail=false;
  for(let j=0;j<3;j++){const t=normal(board,ms,j,used);if(!t){fail=true;break}tasks.push(t);used.add(t.target)}
  if(fail)continue;tasks.push(fourth);
  const s=skull(board,ms,used,null);if(!s)continue;tasks.push(s);used.add(s.target);
  const r=removal(board,ms,used);if(!r)continue;tasks.push(r);
  // The adjacency rule is evaluated after the final difficulty ordering.
  const counts=new Map();for(const t of tasks)for(const n of t.clueIds)counts.set(n,(counts.get(n)||0)+1);
  if([...counts.values()].some(n=>n>2))continue;
  const card=difficulty.score({...board,tasks,seed:seed>>>0,attempts:attempt+1,answerScheme:'314160'});
  if(!difficulty.clueUsageValid(card))continue;
  card.clueRules='R2';return card;
 }
 throw Error('Sopivaa korttia ei löytynyt. Arvo uudelleen.');
}
return {generate};
})();
if(typeof module!=='undefined')module.exports=CardGenerator;
