const CardLevels=(()=>{
 const rules=Object.freeze({
  easy:{label:'Helppo',min:0,max:3499},
  normal:{label:'Tavallinen',min:3500,max:4499},
  challenging:{label:'Haastava',min:4500,max:7999},
  hard:{label:'Vaikea',min:8000,max:Infinity}
 });
 const legacyRules={normal:{min:3200,max:3999},challenging:{min:4000,max:Infinity}};
 const normalMinimum=250,version='L2';
 function classify(score){
  const total=Math.round(score);
  return Object.keys(rules).find(level=>total>=rules[level].min&&total<=rules[level].max);
 }
 function accepts(card,level,revision=version){
  const rule=(revision==='L1'?legacyRules:rules)[level];
  if(!rule||!Number.isFinite(card.score)||card.tasks?.length!==6)return false;
  const total=Math.round(card.score);
  return total>=rule.min&&total<=rule.max&&card.tasks.slice(0,4).every(t=>Number.isFinite(t.difficulty?.score)&&t.difficulty.score>=normalMinimum);
 }
 return {rules,legacyRules,normalMinimum,version,classify,accepts};
})();
if(typeof module!=='undefined')module.exports=CardLevels;
