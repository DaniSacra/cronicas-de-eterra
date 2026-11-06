const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { inPalette } = require('../src/palette.js');
const { viewFit, fontScale, titleOptions } = require('../src/uirules.js');
// titlebg2.js runs on the globals of the scripts loaded before it in index.html
Object.assign(global, require('../src/gridsprite.js'), require('../src/titlebg.js'), require('../src/titleheroes.js'));
const T = require('../src/titlebg2.js');
const { GridSprite, rectsCross, TITLE2_HEROES, TITLE2_SEAT } = global;

const SCREENS = [[1280, 720], [1440, 900], [1536, 826], [1920, 1080], [844, 390], [390, 844]];
const layoutFor = (w, h, dpr) => {
  const fit = viewFit(w * dpr, h * dpr), f = fontScale(w, h, dpr);
  return T.titleLayout2({ W: fit.w, H: fit.h, px: fit.s / dpr, f1: f.f1, f2: f.f2 });
};

test('version B: every color of the scene, the clouds and the siblings is in the master palette', () => {
  for (const file of ['titlebg2.js', 'titleheroes.js']) for (const hex of fs.readFileSync(`${__dirname}/../src/${file}`, 'utf8').match(/#[0-9a-fA-F]{6}/g)) assert.ok(inPalette(hex), `${file} ${hex}`);
  for (const def of [T.TITLE2_LIT.aldo, T.TITLE2_LIT.lyra, T.titleCloud(0, 'lo'), T.titleCloud(1, 'hi'), T.titleCloud(2, 'hi')]) {
    assert.deepEqual(GridSprite.check(def), []);
    for (const c of Object.values(def.pal)) assert.ok(inPalette(c), c);
  }
});

test('version B: the clouds fit the 8-row band, the siblings have two frames and Aldo sits on the stone', () => {
  for (const rows of T.TITLE2_CLOUDS) assert.ok(rows.length <= 8);
  for (const def of Object.values(TITLE2_HEROES)) assert.equal(GridSprite.frameCount(def), 2);
  const a = GridSprite.sizeOf(TITLE2_HEROES.aldo), l = GridSprite.sizeOf(TITLE2_HEROES.lyra);
  assert.ok(TITLE2_SEAT > a.h / 2 && TITLE2_SEAT < a.h - 8, 'legs hang below the seat');
  assert.ok(l.h >= 40 && l.h <= 50, `Lyra is ${l.h} tall`);
});

test('backlight: the top of the silhouette and its upper left side take the sun rim, the rest keeps its color', () => {
  const def = { rows: ['.aa.', 'aaaa', 'aaaa', 'aaaa'], pal: { a: '#55555e' } }, lit = T.rimLit(def, '#f0d860', 0.5);
  assert.deepEqual(lit.frames[0], ['.OO.', 'OaaO', 'aaaa', 'aaaa']);
  assert.equal(lit.pal.O, '#f0d860');
  assert.equal(lit.pal.a, '#55555e');
});

test('version B layout: logo, menu, credit and the A/B button never cover Erukh, the siblings or each other', () => {
  for (const [w, h] of SCREENS) for (const dpr of [1, 3]) {
    if (dpr === 3 && w > 900) continue;
    const L = layoutFor(w, h, dpr), tag = `${w}x${h}@${dpr}`;
    for (const ui of ['logo', 'menu', 'foot', 'ab']) {
      for (const art of ['erukh', 'aldo', 'lyra']) assert.ok(!rectsCross(L[ui], L[art]), `${tag}: ${ui} covers ${art}`);
      for (const other of ['logo', 'menu', 'foot', 'ab']) if (other !== ui) assert.ok(!rectsCross(L[ui], L[other]), `${tag}: ${ui} covers ${other}`);
      const r = L[ui];
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= L.W && r.y + r.h <= L.H, `${tag}: ${ui} inside the screen`);
    }
    assert.ok(L.foot.x + L.foot.w > L.W * 0.7 && L.foot.y + L.foot.h > L.H * 0.9, `${tag}: the credit sits in the bottom right corner`);
    assert.ok(L.erukh.w < 64 && Math.abs(L.erukh.x + L.erukh.w / 2 - L.W / 2) <= L.W * 0.1, `${tag}: Erukh smaller, near the center`);
    assert.equal(L.ruin.x + L.ruin.w, L.W);
    assert.equal(L.aldo.y + TITLE2_SEAT, L.ruin.y, `${tag}: Aldo sits on the top of the ruin`);
    assert.equal(L.lyra.y + L.lyra.h - 1, L.ruin.y, `${tag}: Lyra stands on it`);
  }
});

test('the A/B choice: B unless A was chosen; "Direto à cripta" only with ?dev', () => {
  assert.equal(T.titleVariant(null), 'b');
  assert.equal(T.titleVariant('a'), 'a');
  assert.equal(T.titleVariant('junk'), 'b');
  assert.deepEqual(titleOptions(true, false).map(o => o.value), ['new', 'load']);
  assert.deepEqual(titleOptions(false, true).map(o => o.value), ['new', 'load', 'dungeon']);
  assert.equal(titleOptions(false, false)[1].disabled, true);
});
