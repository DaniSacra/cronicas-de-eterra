// Play as an app on the phone: the service worker (sw.js) keeps the game offline, and the title screen offers
// "Instalar no celular" on touch screens while the game runs in the browser. Android shows its own install prompt;
// the iPhone has none, so the steps are shown instead.
const Install = (() => {
  let ask = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); ask = e; });
  addEventListener('appinstalled', () => { ask = null; });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  const installed = () => matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
  const ios = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const offer = () => !installed() && (!!ask || matchMedia('(pointer: coarse)').matches);
  async function run() {
    if (ask) { const a = ask; ask = null; a.prompt(); await a.userChoice.catch(() => null); return; }
    await UI.choose([{ label: 'Voltar', value: null }], { title: installSteps(ios()), cancel: true, cols: 1 });
  }
  return { offer, run };
})();
