const test = require('node:test');
const assert = require('node:assert/strict');
const { GridSprite } = require('../src/gridsprite.js');
const { inPalette } = require('../src/palette.js');
const { ENEMY_ART } = require('../src/enemyart.js');
const { ENEMIES } = require('../src/data.js');
const { viewFit, battleLayout } = require('../src/uirules.js');
const R2 = require('../src/uirules.js');

// Every enemy of Chapter 1 (cemetery, tavern, crypt and its boss) plus the two the art bible names
const CHAPTER1 = ['ratoCova', 'morcegoCova', 'ossada', 'encapuzado', 'rato', 'morcego', 'gosma', 'aranha', 'esqueleto', 'sineiro'];
const defOf = id => { const e = ENEMIES[id], art = ENEMY_ART[e.sprite]; return e.recolor ? GridSprite.recolorHex(art, e.recolor) : art; };

test('every Chapter 1 enemy is a grid sprite with two idle frames', () => {
  for (const id of CHAPTER1) {
    const art = ENEMY_ART[ENEMIES[id].sprite];
    assert.ok(art, id);
    assert.equal(GridSprite.frameCount(art), 2, id);
    assert.deepEqual(GridSprite.check(art), [], id);
  }
});

test('enemy grids and their palette swaps stay inside the master palette', () => {
  for (const id of CHAPTER1) for (let f = 0; f < 2; f++)
    for (const row of GridSprite.toPixels(defOf(id), f)) for (const col of row) if (col) assert.ok(inPalette(col), `${id}: ${col}`);
});

test('a variant is a palette swap of the same grid', () => {
  for (const [variant, base] of [['ratoCova', 'rato'], ['morcegoCova', 'morcego'], ['esqueleto', 'ossada']]) {
    assert.equal(ENEMIES[variant].sprite, ENEMIES[base].sprite);
    assert.equal(defOf(variant).frames, defOf(base).frames, variant);
    assert.notDeepEqual(defOf(variant).pal, defOf(base).pal, variant);
  }
});

test('sizes follow the bible: commons about 48 to 64, the boss about 96', () => {
  for (const id of CHAPTER1) {
    const { w, h } = GridSprite.sizeOf(ENEMY_ART[ENEMIES[id].sprite]), big = Math.max(w, h);
    if (ENEMIES[id].boss) assert.ok(big >= 80 && big <= 100, `${id} ${w}x${h}`);
    else assert.ok(big >= 48 && big <= 64, `${id} ${w}x${h}`);
  }
});

// Battle HUD measured in the game (logical pixels): bottom of the turn queue, bottom of the name plaque,
// top of the command bar over the active hero card
const SCREENS = {
  '1280x720': { bw: 1280, bh: 720, queue: 30, label: 47, cmd: 123 },
  '1440x900': { bw: 1440, bh: 900, queue: 24, label: 37, cmd: 134 },
  '1920x1080': { bw: 1920, bh: 1080, queue: 29, label: 45, cmd: 127 },
  '390x844 (phone, 3x)': { bw: 1170, bh: 2532, queue: 67, label: 103, cmd: 434 },
  '390x844 (1x)': { bw: 390, bh: 844, queue: 88, label: 140, cmd: 578 },
};
const GROUPS = [...CHAPTER1.map(id => [id]), ['rato', 'morcego', 'gosma'], ['ossada', 'ossada', 'ossada'], ['encapuzado', 'encapuzado'],
  ['aranha', 'esqueleto', 'aranha'], ['ratoCova', 'morcegoCova'], ['gosma', 'gosma', 'gosma']];

test('battle: whole scale, whole pixels, inside the screen and clear of the HUD at every resolution', () => {
  for (const [name, S] of Object.entries(SCREENS)) {
    const { w: VW, h: VH } = viewFit(S.bw, S.bh);
    for (const g of GROUPS) {
      const boss = g.some(id => ENEMIES[id].boss);
      const sizes = g.map(id => ({ ...GridSprite.sizeOf(ENEMY_ART[ENEMIES[id].sprite]), float: !!ENEMIES[id].float }));
      battleLayout(sizes, VW, VH, boss).forEach((L, i) => {
        const tag = `${name} ${g.join('+')} #${i}`;
        assert.ok(Number.isInteger(L.scale) && L.scale >= 1, tag + ' scale');
        for (const k of ['left', 'top', 'base', 'w', 'h']) assert.ok(Number.isInteger(L[k]), `${tag} ${k}=${L[k]}`);
        assert.ok(L.left >= 0 && L.left + L.w <= VW, `${tag} inside width`);
        assert.ok(L.top >= (boss ? S.queue : S.label), `${tag} top ${L.top} under the HUD`);
        assert.ok(L.base + (boss ? 0 : 10) <= S.cmd, `${tag} base ${L.base} over the command bar`);
      });
    }
  }
});

test('the common enemies of one group never overlap in their row (a tall view uses two staggered rows)', () => {
  for (const S of Object.values(SCREENS)) {
    const { w: VW, h: VH } = viewFit(S.bw, S.bh);
    const L = battleLayout(['aranha', 'rato', 'morcego'].map(id => GridSprite.sizeOf(ENEMY_ART[ENEMIES[id].sprite])), VW, VH);
    const rows = Object.values(Object.groupBy(L, l => l.base)).map(r => r.sort((a, b) => a.left - b.left));
    for (const r of rows) for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].left + r[i - 1].w <= r[i].left, `${VW}x${VH}: ${i - 1} and ${i}`);
    for (const l of L) assert.ok(l.left >= 0 && l.left + l.w <= VW, `${VW}x${VH}: inside the view`);
  }
});

test('portrait battle: three enemies in two rows at scale 2, inside the view and above the command bar', () => {
  const sizes = ['ratoCova', 'morcegoCova', 'ossada'].map(id => GridSprite.sizeOf(ENEMY_ART[ENEMIES[id].sprite]));
  const L = battleLayout(sizes, 294, 634);
  assert.ok(L.every(l => l.scale === 2), L.map(l => l.scale).join());
  assert.equal(new Set(L.map(l => l.base)).size, 2, 'two rows');
  for (const l of L) assert.ok(l.left >= 0 && l.left + l.w <= 294 && l.top >= Math.round(634 * 0.26) && l.base <= 634 * 0.56, JSON.stringify(l));
  assert.equal(new Set(battleLayout(sizes, 320, 180).map(l => l.base)).size, 2, 'landscape keeps its one staggered line (back/front by parity)');
});

test('1280x720 is the 320x180 base at 4x', () => assert.deepEqual(viewFit(1280, 720), { w: 320, h: 180, s: 4 }));

test('every enemy in one battle shares the same scale', () => {
  for (const S of Object.values(SCREENS)) {
    const { w: VW, h: VH } = viewFit(S.bw, S.bh);
    for (const g of GROUPS) {
      const L = battleLayout(g.map(id => GridSprite.sizeOf(ENEMY_ART[ENEMIES[id].sprite])), VW, VH, g.some(id => ENEMIES[id].boss));
      assert.equal(new Set(L.map(l => l.scale)).size, 1, `${VW}x${VH} ${g.join('+')}`);
    }
  }
});

test('portrait battle: the enemies stand higher, above the party band and the command bar; landscape and PC unchanged', () => {
  assert.equal(R2.battleFloor(320, 180), R2.BATTLE_FLOOR);
  assert.equal(R2.battleFloor(422, 196), R2.BATTLE_FLOOR);
  const tall = viewFit(1170, 2532), base = Math.round(tall.h * R2.battleFloor(tall.w, tall.h));
  assert.ok(base <= tall.h * 0.6, 'floor at 60% of a 390x844 phone, still over the command bar');
  const sizes = ['ratoCova', 'morcegoCova', 'ossada'].map(id => ({ ...GridSprite.sizeOf(ENEMY_ART[ENEMIES[id].sprite]), float: !!ENEMIES[id].float }));
  for (const L of battleLayout(sizes, tall.w, tall.h)) assert.ok(L.base <= base && L.top >= 0, JSON.stringify(L));
});

test('turn queue faces: every grid enemy has a 32x32 head crop inside its sprite, and the crop is mostly the creature', () => {
  const { ENEMY_ART } = require('../src/enemyart.js');
  const { GridSprite } = require('../src/gridsprite.js');
  for (const [k, art] of Object.entries(ENEMY_ART)) {
    const [x, y] = art.face, { w, h } = GridSprite.sizeOf(art);
    assert.ok(x >= 0 && y >= 0 && x + 32 <= w && y + 32 <= h, `${k}: ${x},${y} in ${w}x${h}`);
    const px = GridSprite.toPixels(art, 0);
    let filled = 0;
    for (let j = y; j < y + 32; j++) for (let i = x; i < x + 32; i++) if (px[j][i]) filled++;
    assert.ok(filled > 32 * 32 * 0.4, `${k}: only ${filled} pixels in the head crop`);
  }
});

test('common enemies stand out on the field, one size under a boss; the road north fights on snow, not among graves', () => {
  const R = require('../src/uirules.js'), { battlePlace, BATTLE_PLACES } = require('../src/battlebg.js');
  const sizes = ['loboGeada', 'loboGeada'].map(id => GridSprite.sizeOf(ENEMY_ART[ENEMIES[id].sprite]));
  for (const [w, h] of [[320, 180], [294, 634], [422, 196]]) {
    const L = R.battleLayout(sizes, w, h), floor = Math.round(h * R.battleFloor(w, h));
    assert.ok(L.every(l => l.scale <= 2), `${w}x${h} scale ${L[0].scale}`);
    assert.ok(Math.max(...L.map(l => l.base)) < floor - 12, `${w}x${h}: a step into the scene`);
  }
  assert.ok(BATTLE_PLACES.includes('estrada'));
  assert.equal(battlePlace({ mode: 'town', area: 'estrada' }), 'estrada');
});
