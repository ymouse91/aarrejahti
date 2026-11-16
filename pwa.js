if ('serviceWorker' in navigator) {
  let refreshing=false;
  const hadController=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(hadController&&!refreshing){refreshing=true;location.reload();}
  });
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'})
      .then(registration=>registration.update())
      .catch(error=>console.warn('Offline-välimuisti ei ole käytettävissä.',error));
  });
}
