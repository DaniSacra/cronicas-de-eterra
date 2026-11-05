// node --test test/
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../src/frame.js');

const colors = grid => new Set(grid.join('').replace(/\./g, ''));

test('frame tile is 16×16 and uses only palette colors', () => {
  for (const v of Object.keys(F.FRAME_VARIANTS)) {
    const g = F.frameGrid(v);
    assert.equal(g.length, 16);
    for (const row of g) assert.equal(row.length, 16);
    for (const ch of colors(g)) assert.ok(F.UI_PAL[ch], `${v}: unknown color ${ch}`);
  }
});

test('9-slice cuts corner/edge/corner and the nine pieces cover the tile exactly', () => {
  const s = F.frameSlices();
  const k = F.FRAME_SLICE, m = 16 - 2 * k;
  assert.ok(k >= 3 && k <= 5);
  assert.deepEqual(s.tl, { x: 0, y: 0, w: k, h: k });
  assert.deepEqual(s.c, { x: k, y: k, w: m, h: m });
  assert.deepEqual(s.br, { x: k + m, y: k + m, w: k, h: k });
  const area = Object.values(s).reduce((a, p) => a + p.w * p.h, 0);
  assert.equal(area, 16 * 16);
});

test('edges repeat without seams and the center is flat fill', () => {
  const g = F.FRAME_GRID, k = F.FRAME_SLICE, e = 16 - k;
  const column = x => g.map(r => r[x]).join('');
  for (let x = k; x < e; x++) assert.equal(column(x), column(k), `top/bottom edge column ${x}`);
  for (let y = k; y < e; y++) assert.equal(g[y], g[k], `side edge row ${y}`);
  const fill = g[8][8];
  for (let y = k; y < e; y++) assert.equal(g[y].slice(k, e), fill.repeat(16 - 2 * k));
});

test('corners are notched (transparent outer pixel)', () => {
  const g = F.FRAME_GRID;
  for (const [x, y] of [[0, 0], [15, 0], [0, 15], [15, 15]]) assert.equal(g[y][x], '.');
});

test('variants only recolor: same transparent shape as the base frame', () => {
  const mask = g => g.map(r => r.replace(/[^.]/g, '#'));
  for (const v of Object.keys(F.FRAME_VARIANTS)) assert.deepEqual(mask(F.frameGrid(v)), mask(F.FRAME_GRID));
  assert.ok(colors(F.frameGrid('sel')).has('g'), 'sel frame is gold');
  assert.ok(colors(F.frameGrid('danger')).has('d'), 'danger frame is red');
});
