importScripts('data.js','rules.js','levels.js','generator.js','difficulty.js');
self.onmessage=({data})=>{
 try{
  const card=CardGenerator.generate(data.seed,attempt=>self.postMessage({status:'Etsitään sopivaa asetelmaa…',attempt}),{level:data.level||'normal'});
  self.postMessage({status:'Lasketaan retkien vaikeutta…'});
  self.postMessage({card});
 }catch(e){self.postMessage({error:e.message||'Arvonta epäonnistui.'})}
};
