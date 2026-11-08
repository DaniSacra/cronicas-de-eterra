// Offline play for the installed game. Installing caches every file index.html loads (read from its src/href,
// so the list never needs editing) and the Google fonts. Then the network wins whenever there is one, so a new
// version arrives on the next open with internet; without it, the cached copy plays.
const CACHE = 'eterra';
const shellFiles = html => ['./', 'index.html', 'manifest.webmanifest',
  ...[...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(m => m[1])].filter((f, i, a) => a.indexOf(f) === i);
const fontCss = html => [...html.matchAll(/href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'));

async function install() {
  const c = await caches.open(CACHE), html = await (await fetch('index.html', { cache: 'no-store' })).text();
  await c.addAll(shellFiles(html));
  for (const url of fontCss(html)) { // the font files the stylesheet points to, for this device
    const css = await fetch(url).then(r => r.text()).catch(() => '');
    await c.put(url, new Response(css, { headers: { 'Content-Type': 'text/css' } }));
    await Promise.all([...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => c.add(m[1]).catch(() => {})));
  }
}
if (typeof self !== 'undefined' && self.addEventListener) {
  self.addEventListener('install', e => e.waitUntil(install().then(() => self.skipWaiting())));
  self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
  self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    e.respondWith(fetch(e.request).then(r => {
      if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
  });
}
if (typeof module !== 'undefined') module.exports = { shellFiles, fontCss };
