const CardLevels=(()=>{
 const rules=Object.freeze({normal:{label:'Tavallinen',min:3200,max:3999},challenging:{label:'Haastava',min:4000,max:Infinity}});
 const normalMinimum=250,version='L1';
 function accepts(card,level){
  const rule=rules[level];if(!rule||!Number.isFinite(card.score)||card.tasks?.length!==6)return false;
  const total=Math.round(card.score);
  return total>=rule.min&&total<=rule.max&&card.tasks.slice(0,4).every(t=>Number.isFinite(t.difficulty?.score)&&t.difficulty.score>=normalMinimum);
 }
 return {rules,normalMinimum,version,accepts};
})();
if(typeof module!=='undefined')module.exports=CardLevels;
