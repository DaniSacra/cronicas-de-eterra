const test = require('node:test');
const assert = require('node:assert/strict');
const { PALETTE, PALETTE_ALL, inPalette } = require('../src/palette.js');
const { HERO_FACES, HERO_FACE_BG } = require('../src/herofaces.js');

test('master palette: lowercase #rrggbb, no duplicates across families', () => {
  const all = Object.values(PALETTE).flat();
  for (const c of all) assert.match(c, /^#[0-9a-f]{6}$/);
  assert.equal(new Set(all).size, all.length);
  assert.equal(PALETTE_ALL.size, all.length);
});

test('master palette: the six named families are there', () => {
  for (const f of ['luz', 'noite', 'vida', 'misterio', 'perigo', 'materia']) assert.ok(PALETTE[f].length >= 5, f);
  assert.ok(inPalette('#4AD08A'), 'case-insensitive lookup');
  assert.ok(!inPalette('#123456'));
});

test('hero portraits use only master palette colors', () => {
  for (const [id, f] of Object.entries(HERO_FACES))
    for (const ch of new Set(f.rows.join('').replace(/\./g, ''))) assert.ok(inPalette(f.pal[ch]), `${id}: ${ch} ${f.pal[ch]}`);
  for (const [id, bands] of Object.entries(HERO_FACE_BG)) for (const c of bands) assert.ok(inPalette(c), `${id} bg ${c}`);
});

test('hero expressions: every mood keeps the 32x32 grid and stays inside the master palette', () => {
  const { HERO_MOODS, MOODS, heroFace } = require('../src/herofaces.js');
  const { GridSprite } = require('../src/gridsprite.js');
  for (const id of Object.keys(HERO_FACES)) {
    assert.deepEqual(Object.keys(HERO_MOODS[id]).sort(), MOODS.filter(m => m !== 'normal').sort(), id);
    for (const mood of MOODS) {
      const def = heroFace(id, mood);
      assert.deepEqual(GridSprite.check(def), [], `${id} ${mood}`);
      assert.equal(def.rows.length, 32); for (const r of def.rows) assert.equal(r.length, 32);
      for (const c of Object.values(def.pal)) assert.ok(inPalette(c), `${id} ${mood} ${c}`);
      if (mood !== 'normal') assert.notDeepEqual(def.rows, HERO_FACES[id].rows, `${id} ${mood} changes the face`);
    }
  }
});

test('every NPC portrait is a 32x32 grid in the master palette', () => {
  const { NPC_FACES } = require('../src/npcfaces.js');
  const { GridSprite } = require('../src/gridsprite.js');
  for (const [id, def] of Object.entries(NPC_FACES)) {
    assert.deepEqual(GridSprite.check(def), [], id);
    assert.equal(def.rows.length, 32); for (const r of def.rows) assert.equal(r.length, 32, id);
    for (const c of [...Object.values(def.pal), ...def.bg]) assert.ok(inPalette(c), `${id} ${c}`);
  }
});

test('every story speaker has a grid portrait', () => {
  const { NPC_FACES } = require('../src/npcfaces.js');
  const { HERO_FACES } = require('../src/herofaces.js');
  Object.assign(globalThis, { NPC_FACES, HERO_FACES, PARTY_DEFS: [{ id: 'aldo', name: 'Aldo' }] });
  const { Portraits } = require('../src/portraits.js');
  const speakers = ['Aldo', 'Ana, a fiandeira', 'Ancião Bertoldo', 'Andilla', 'Berta, a taverneira', 'Bigode', 'Bruno, soldado de folga',
    'Caio', 'Clara, a professora', 'Dona Marta', 'Dora, a mercadora', 'Encapuzado', 'Guarda Hugo', 'Irmã Irene',
    'Lia', 'Lápide', 'Mensageiro', 'Moça dos dados', 'Nino', 'O Sineiro', 'Rui, o lavrador', 'Tomé, o pescador', 'Bilhete'];
  for (const name of speakers) {
    const key = Portraits.keyFor(name);
    assert.ok(key && (NPC_FACES[key] || HERO_FACES[key]), name);
  }
  assert.equal(Portraits.keyFor('Esqueleto'), null);
});
