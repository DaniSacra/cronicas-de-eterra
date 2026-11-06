const test = require('node:test');
const assert = require('node:assert/strict');
const { GridSprite } = require('../src/gridsprite.js');
const { inPalette } = require('../src/palette.js');
const { ENEMY_ART } = require('../src/enemyart.js');
const { ENEMIES } = require('../src/data.js');
const { viewFit, battleLayout } = require('../src/uirules.js');

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

test('the common enemies of one group never overlap', () => {
  for (const S of Object.values(SCREENS)) {
    const { w: VW, h: VH } = viewFit(S.bw, S.bh);
    const L = battleLayout(['aranha', 'rato', 'morcego'].map(id => GridSprite.sizeOf(ENEMY_ART[ENEMIES[id].sprite])), VW, VH);
    for (let i = 1; i < L.length; i++) assert.ok(L[i - 1].left + L[i - 1].w <= L[i].left, `${VW}x${VH}: ${i - 1} and ${i}`);
  }
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
