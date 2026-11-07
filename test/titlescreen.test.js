const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { inPalette } = require('../src/palette.js');
const { GridSprite } = require('../src/gridsprite.js');
const { viewFit, fontScale, titleOptions } = require('../src/uirules.js');
const T = require('../src/titlebg.js');

const SCREENS = [[1280, 720], [1440, 900], [1536, 826], [1920, 1080], [390, 844], [844, 390]];
const layoutFor = (w, h, dpr = 1) => {
  const fit = viewFit(w * dpr, h * dpr), fs = fontScale(w, h, dpr);
  return { fit, L: T.titleLayout({ W: fit.w, H: fit.h, px: fit.s / dpr, f1: fs.f1, f2: fs.f2 }) };
};

test('every color of the title scene and its sprites is in the master palette', () => {
  const src = fs.readFileSync(`${__dirname}/../src/titlebg.js`, 'utf8');
  for (const hex of src.match(/#[0-9a-fA-F]{6}/g)) assert.ok(inPalette(hex), hex);
  for (const def of [T.TITLE_STAR, T.TITLE_HEROES.aldo, T.TITLE_HEROES.lyra]) for (const c of Object.values(def.pal)) assert.ok(inPalette(c), c);
});

test('Aldo and Lyra on the ruin: same-width rows, every letter colored, two frames, Lyra 40 to 48 pixels tall', () => {
  for (const [id, def] of Object.entries(T.TITLE_HEROES)) {
    assert.deepEqual(GridSprite.check(def), [], id);
    assert.equal(GridSprite.frameCount(def), 2, id);
  }
  assert.deepEqual(GridSprite.check(T.TITLE_STAR), []);
  const h = GridSprite.sizeOf(T.TITLE_HEROES.lyra).h;
  assert.ok(h >= 40 && h <= 48, `Lyra is ${h} tall`);
});

test('the logo and the menu never cover Erukh, Aldo or Lyra, at a whole scale, on every screen', () => {
  for (const [w, h] of SCREENS) for (const dpr of [1, 3]) {
    if (dpr === 3 && w > 900) continue; // phones only
    const { fit, L } = layoutFor(w, h, dpr), tag = `${w}x${h}@${dpr}`;
    assert.ok(Number.isInteger(fit.s) && fit.s >= 1, tag);
    for (const ui of ['logo', 'menu']) for (const art of ['erukh', 'aldo', 'lyra']) assert.ok(!T.rectsCross(L[ui], L[art]), `${tag}: ${ui} covers ${art}`);
    for (const k of ['erukh', 'aldo', 'lyra', 'logo', 'menu']) {
      const r = L[k];
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= L.W && r.y + r.h <= L.H, `${tag}: ${k} inside the screen`);
    }
    assert.ok(Math.abs(L.erukh.x + L.erukh.w / 2 - L.W / 2) <= L.W * 0.1, `${tag}: Erukh near the center`);
    assert.equal(L.ruin.x + L.ruin.w, L.W, `${tag}: the ruin is anchored to the right`);
    for (const k of [0, 0.5, 1]) { const y = T.cloudY(L.clouds, k); if (y === null) continue; const cloud = { x: 0, y: y - 2, w: L.W, h: 8 };
      for (const art of ['logo', 'erukh']) assert.ok(!T.rectsCross(cloud, L[art]), `${tag}: a cloud crosses the ${art}`); }
  }
});

test('the camera descent ends on the final frame and any input skips it', () => {
  const d = T.makeDescent(1000);
  assert.equal(d.at(1000), 0);
  assert.ok(d.at(1000 + T.TITLE_DESCENT_MS / 2) > 0.5 && !d.done(1000 + T.TITLE_DESCENT_MS / 2));
  assert.equal(d.at(1000 + T.TITLE_DESCENT_MS), 1);
  assert.ok(d.done(1000 + T.TITLE_DESCENT_MS + 50));
  const s = T.makeDescent(0);
  s.skip();
  assert.equal(s.at(10), 1, 'skipped at once');
  assert.ok(s.done(10));
});

test('the dev start menu only with ?dev in the address', () => {
  assert.deepEqual(titleOptions(true, false).map(o => o.value), ['new', 'load']);
  assert.deepEqual(titleOptions(false, true).map(o => o.value), ['new', 'load', 'dev']);
  assert.equal(titleOptions(false, false)[1].disabled, true);
});
