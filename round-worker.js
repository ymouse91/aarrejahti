importScripts('engine.js?v=rounds18','game-data.js?v=rounds18','rounds.js?v=rounds18');
self.onmessage=e=>{try{const round=Expeditions.generate(e.data.seed);Expeditions.validate(round);self.postMessage({round});}catch(error){self.postMessage({error:error.message});}};
