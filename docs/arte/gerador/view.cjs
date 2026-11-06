const { chromium } = require('/home/dani/projects/jerusalem-antiga/node_modules/playwright');
const S = +(process.argv[2] || 6), OUT = __dirname + '/../c/enemies.png', names = process.argv.slice(3);
(async () => {
  const b = await chromium.launch({ args: ['--disable-gpu', '--use-gl=disabled', '--disable-software-rasterizer'] });
  const p = await b.newPage();
  await p.setContent('<body style="margin:0;background:#3a2a4a"></body>');
  await p.addScriptTag({ path: '/home/dani/games/dungeon-rpg/src/gridsprite.js' });
  await p.addScriptTag({ path: '/home/dani/games/dungeon-rpg/src/enemyart.js' });
  const url = await p.evaluate(([S, names]) => {
    const ids = names.length ? names : Object.keys(ENEMY_ART);
    const sizes = ids.map(id => GridSprite.sizeOf(ENEMY_ART[id]));
    const W = Math.max(...sizes.map(s => s.w)) * S * 2 + 3 * 8, H = sizes.reduce((a, s) => a + s.h * S + 8, 8);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    c.fillStyle = '#4a3a5a'; c.fillRect(0, 0, W, H);
    let y = 8;
    ids.forEach((id, i) => { for (let f = 0; f < 2; f++) c.drawImage(GridSprite.render(ENEMY_ART[id], f), 8 + f * (sizes[i].w * S + 8), y, sizes[i].w * S, sizes[i].h * S); y += sizes[i].h * S + 8; });
    return cv.toDataURL();
  }, [S, names]);
  require('fs').writeFileSync(OUT, Buffer.from(url.split(',')[1], 'base64')); await b.close();
})();
