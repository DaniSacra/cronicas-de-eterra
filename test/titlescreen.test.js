const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { inPalette } = require('../src/palette.js');
const { GridSprite } = require('../src/gridsprite.js');
const { viewFit, fontScale, titleOptions } = require('../src/uirules.js');
// titlebg.js uses the siblings of src/titleheroes.js, loaded before it in index.html
const { TITLE_HEROES, TITLE_SEAT } = Object.assign(global, require('../src/titleheroes.js'));
const T = require('../src/titlebg.js');

const SCREENS = [[1280, 720], [1440, 900], [1536, 826], [1920, 1080], [390, 844], [844, 390]];
const layoutFor = (w, h, dpr = 1) => {
  const fit = viewFit(w * dpr, h * dpr), fs = fontScale(w, h, dpr);
  return { fit, L: T.titleLayout({ W: fit.w, H: fit.h, px: fit.s / dpr, f1: fs.f1, f2: fs.f2 }) };
};

test('every color of the title scene and its sprites is in the master palette', () => {
  for (const f of ['titlebg.js', 'titleheroes.js']) for (const hex of fs.readFileSync(`${__dirname}/../src/${f}`, 'utf8').match(/#[0-9a-fA-F]{6}/g)) assert.ok(inPalette(hex), `${f} ${hex}`);
  for (const def of [T.TITLE_STAR, TITLE_HEROES.aldo, TITLE_HEROES.lyra]) for (const c of Object.values(def.pal)) assert.ok(inPalette(c), c);
});

test('Aldo standing and Lyra sitting on the ruin: same-width rows, every letter colored, two frames', () => {
  for (const [id, def] of Object.entries(TITLE_HEROES)) {
    assert.deepEqual(GridSprite.check(def), [], id);
    assert.equal(GridSprite.frameCount(def), 2, id);
  }
  assert.deepEqual(GridSprite.check(T.TITLE_STAR), []);
  const a = GridSprite.sizeOf(TITLE_HEROES.aldo).h, l = GridSprite.sizeOf(TITLE_HEROES.lyra).h;
  assert.ok(a >= 44 && a <= 52, `Aldo is ${a} tall`);
  assert.ok(TITLE_SEAT > l / 2 && TITLE_SEAT < l - 8, 'Lyra sits with her legs hanging below the seat');
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
    assert.equal(L.lyra.y + TITLE_SEAT, L.ruin.y, `${tag}: Lyra sits on the top of the ruin`);
    assert.equal(L.aldo.y + L.aldo.h - 1, L.ruin.y, `${tag}: Aldo stands on it`);
    assert.ok(!T.rectsCross(L.aldo, L.lyra), `${tag}: the siblings side by side`);
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

test('"Direto à cripta" only with ?dev in the address', () => {
  assert.deepEqual(titleOptions(true, false).map(o => o.value), ['new', 'load']);
  assert.deepEqual(titleOptions(false, true).map(o => o.value), ['new', 'load', 'dungeon']);
  assert.equal(titleOptions(false, false)[1].disabled, true);
});
