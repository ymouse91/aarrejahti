if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Offline-välimuisti ei ole käytettävissä.', error));
  });
}
