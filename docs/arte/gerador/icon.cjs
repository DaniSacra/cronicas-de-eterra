// App icons for the installed game (manifest.webmanifest): Aldo's portrait with its window bands, full bleed,
// at an integer scale (32 px grid: x6 = 192, x16 = 512). Run: node docs/arte/gerador/icon.cjs  (writes icons/)
const { chromium } = require('/home/dani/projects/jerusalem-antiga/node_modules/playwright');
const fs = require('fs'), ROOT = __dirname + '/../../..';
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  for (const f of ['palette', 'data', 'gridsprite', 'herofaces']) await p.addScriptTag({ path: `${ROOT}/src/${f}.js` });
  for (const size of [192, 512]) {
    const url = await p.evaluate(size => {
      const cv = document.createElement('canvas'); cv.width = cv.height = size;
      const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
      c.drawImage(GridSprite.render(heroFace('aldo')), 0, 0, size, size);
      return cv.toDataURL('image/png');
    }, size);
    fs.writeFileSync(`${ROOT}/icons/icon-${size}.png`, Buffer.from(url.split(',')[1], 'base64'));
  }
  await b.close();
  console.log('ok icons/icon-192.png icons/icon-512.png');
})();
