importScripts('data.js','rules.js','generator.js','difficulty.js');
self.onmessage=({data})=>{
 try{
  const card=CardGenerator.generate(data.seed,attempt=>self.postMessage({status:'Etsitään sopivaa asetelmaa…',attempt}));
  self.postMessage({status:'Lasketaan retkien vaikeutta…'});
  self.postMessage({card:CardDifficulty.score(card)});
 }catch(e){self.postMessage({error:e.message||'Arvonta epäonnistui.'})}
};
