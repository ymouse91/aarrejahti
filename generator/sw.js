const CACHE='cardgen-aarrejahti-v1.1.0';
const FILES=['./','index.html','style.css','app.js','worker.js','data.js','rules.js','generator.js','difficulty.js','manifest.webmanifest','icon.svg','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','icons/favicon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('cardgen-aarrejahti-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||!event.request.url.startsWith(self.registration.scope))return;
 event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request,{ignoreSearch:true})).then(hit=>hit||fetch(event.request)));
});
