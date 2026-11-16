importScripts('engine.js?v=rounds31','game-data.js?v=rounds31','rounds.js?v=rounds31');
self.onmessage=e=>{try{const round=Expeditions.generate(e.data.seed,e.data.level,{progress:attempts=>self.postMessage({attempts})});Expeditions.validate(round);self.postMessage({round});}catch(error){self.postMessage({error:error.message});}};
