const test = require('node:test');
const assert = require('node:assert/strict');
const { GridSprite } = require('../src/gridsprite.js');
const { inPalette } = require('../src/palette.js');
const { HERO_FACES, HERO_FACE_BG, heroFace } = require('../src/herofaces.js');

// Every grid sprite in the game, by name (enemies join this list in src/enemyart.js)
const ALL = () => {
  const out = {};
  for (const id of Object.keys(HERO_FACES)) out['face:' + id] = heroFace(id);
  return out;
};

test('grid sprites: every row of every frame has the same width, every letter has a color', () => {
  for (const [name, def] of Object.entries(ALL())) assert.deepEqual(GridSprite.check(def), [], name);
});

test('grid sprites: every color is in the master palette', () => {
  for (const [name, def] of Object.entries(ALL()))
    for (let f = 0; f < GridSprite.frameCount(def); f++)
      for (const row of GridSprite.toPixels(def, f)) for (const col of row) if (col) assert.ok(inPalette(col), `${name}: ${col}`);
});

test('check() reports uneven rows and letters without color', () => {
  assert.deepEqual(GridSprite.check({ rows: ['ab', 'a'], pal: { a: '#ffffff' } }).length, 2); // 'b' without color, second row too short
});

test('recolor swaps colors and keeps the grid', () => {
  const base = { rows: ['ab'], pal: { a: '#ffffff', b: '#000000' } }, v = GridSprite.recolor(base, { b: '#4ad08a' });
  assert.equal(v.rows, base.rows);
  assert.deepEqual(GridSprite.toPixels(v), [['#ffffff', '#4ad08a']]);
  assert.equal(base.pal.b, '#000000');
});

// The old portrait drawing (four 8px bands, then the grid on top), kept here as the reference
function oldPortrait(id) {
  const H = HERO_FACES[id], bg = HERO_FACE_BG[id], px = [];
  for (let y = 0; y < 32; y++) { px.push([]); for (let x = 0; x < 32; x++) px[y].push(bg[Math.floor(y / 8)]); }
  H.rows.forEach((row, y) => { for (let x = 0; x < 32; x++) if (row[x] !== '.') px[y][x] = H.pal[row[x]]; });
  return px;
}

test('hero portraits stay pixel-identical through GridSprite', () => {
  for (const id of Object.keys(HERO_FACES)) assert.deepEqual(GridSprite.toPixels(heroFace(id)), oldPortrait(id), id);
});

module.exports = { ALL };
