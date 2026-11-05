const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../src/frame.js');

const COMMANDS = ['atk', 'spell', 'item', 'def', 'run'];
const ids = Object.keys(F.ICON_ART);

test('battle commands and inventory have icons', () => {
  for (const id of [...COMMANDS, 'pocao', 'eter', 'elixir', 'pena', 'estojo', 'carta', 'mundo']) assert.ok(ids.includes(id), id);
});

test('every icon state is 16×16 with palette colors', () => {
  for (const id of ids) for (const st of F.ICON_STATES) {
    const g = F.iconGrid(id, st);
    assert.equal(g.length, 16, `${id}/${st}`);
    for (const row of g) {
      assert.equal(row.length, 16, `${id}/${st}`);
      for (const ch of row) assert.ok(ch === '.' || F.UI_PAL[ch], `${id}/${st}: ${ch}`);
    }
  }
});

test('selected = normal drawing plus a gold halo on transparent pixels only', () => {
  for (const id of ids) {
    const n = F.iconGrid(id, 'normal'), s = F.iconGrid(id, 'sel');
    let added = 0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (n[y][x] !== '.') assert.equal(s[y][x], n[y][x], `${id} keeps its pixels`);
      else if (s[y][x] !== '.') { assert.equal(s[y][x], 'g', `${id} halo is gold`); added++; }
    }
    assert.ok(added > 0, `${id} gets a halo`);
  }
});

test('disabled keeps the outline and greys everything else', () => {
  for (const id of ids) {
    const n = F.iconGrid(id, 'normal'), d = F.iconGrid(id, 'dis');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (n[y][x] === '.' || n[y][x] === 'k') assert.equal(d[y][x], n[y][x]);
      else assert.ok(d[y][x] === 'm' || d[y][x] === 'x', `${id} pixel ${x},${y} is grey`);
    }
  }
});

test('unknown icon or state fails loudly', () => {
  assert.throws(() => F.iconGrid('nope'));
  assert.throws(() => F.iconGrid('atk', 'shiny'));
});
