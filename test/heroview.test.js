const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/uirules.js');
const D = require('../src/data.js');
const { HERO_BODY, GEAR_LOOK } = require('../src/herobody.js');
const { GridSprite } = require('../src/gridsprite.js');
const { inPalette } = require('../src/palette.js');
const { ICON_ART } = require('../src/frame.js');

const IDS = ['aldo', 'lyra', 'teo', 'andilla'];

test('full-body sprites: same-width rows, every letter colored, palette colors only, two frames, 48x64', () => {
  for (const id of IDS) {
    for (const def of [HERO_BODY[id], HERO_BODY[id + 'Ko']]) {
      assert.deepEqual(GridSprite.check(def), [], id);
      for (const c of Object.values(def.pal)) assert.ok(inPalette(c), `${id} ${c}`);
      assert.deepEqual(GridSprite.sizeOf(def), { w: 48, h: 64 }, id);
    }
    assert.equal(GridSprite.frameCount(HERO_BODY[id]), 2, id);
  }
  for (const look of Object.values(GEAR_LOOK)) for (const c of Object.values(look)) assert.ok(inPalette(c), c);
  for (const id of Object.keys(GEAR_LOOK)) assert.ok(D.EQUIPS[id], `${id} is an equipment`);
});

test('every skill of every hero has a description, a target text and an icon that exists', () => {
  for (const d of D.PARTY_DEFS) for (const [, id] of d.spells) {
    const sp = D.SPELLS[id];
    assert.ok(sp.desc && !sp.desc.includes('—'), id);
    assert.ok(R.TARGET_TEXT[sp.target], id);
    assert.ok(ICON_ART[R.spellIcon(sp)], `${id}: ${R.spellIcon(sp)}`);
  }
});

test('skills book: known by level, the rest still to come with their level', () => {
  const lyra = D.PARTY_DEFS.find(d => d.id === 'lyra');
  assert.deepEqual(R.spellBook(lyra.spells, 3), [{ id: 'fogo', lv: 1, known: true }, { id: 'gelo', lv: 3, known: true }, { id: 'raio', lv: 5, known: false }]);
  assert.equal(R.spellBook(lyra.spells, 1).filter(s => s.known).length, 1);
});

test('slots show the best equipment found, or the starting gear by name, never an empty box', () => {
  const s0 = R.slotGear('aldo', [], D.EQUIPS, D.START_GEAR);
  assert.deepEqual(s0.map(s => [s.name, s.start]), [['Espada de viagem', true], ['Túnica de couro', true]]);
  const s1 = R.slotGear('aldo', ['espadaFerro', 'espadaPrata'], D.EQUIPS, D.START_GEAR);
  assert.equal(s1[0].name, 'Espada de Prata');
  assert.deepEqual(s1[0].bonus, { atk: 10 });
  for (const id of IDS) for (const s of R.slotGear(id, [], D.EQUIPS, D.START_GEAR)) assert.ok(s.name && ICON_ART[s.icon], `${id} ${s.slot}`);
  // the sprite changes colors with what is equipped, and only for its owner
  const pal = R.bodyPal(HERO_BODY.aldo.pal, 'aldo', ['espadaPrata', 'cajadoRunico'], D.EQUIPS, GEAR_LOOK);
  assert.equal(pal.g, GEAR_LOOK.espadaPrata.g);
  assert.equal(pal.E, HERO_BODY.aldo.pal.E);
});

test('attributes with equipment bonus and a bar against the best of the party', () => {
  const rows = R.statRows([{ total: { atk: 20, def: 10, mag: 4, res: 5, agi: 7 }, bonus: { atk: 6 } }, { total: { atk: 10, def: 5, mag: 16, res: 15, agi: 10 }, bonus: {} }], 1);
  assert.deepEqual(rows.map(r => r.key), ['atk', 'def', 'mag', 'res', 'agi']);
  assert.equal(rows[3].frac, 1, 'Resistência has its own row');
  assert.equal(rows[0].frac, 0.5);
  assert.equal(rows[2].frac, 1);
  assert.equal(R.statRows([{ total: { atk: 20, def: 10, mag: 4, agi: 7 }, bonus: { atk: 6 } }], 0)[0].bonus, 6);
  assert.equal(R.xpLeftText(30, 2, 42), 'Faltam 12 XP para o nível\u00a03');
});

test('the story grows with flags and never shows a spoiler or an em dash', () => {
  const a = D.HERO_STORY.aldo;
  assert.equal(R.storyLines(a.lines, {}).length, 2);
  assert.equal(R.storyLines(a.lines, { quest: 1, bossDead: true }).length, R.STORY_MAX, 'only the last two show, and the quote makes three');
  assert.equal(R.storyLines(a.lines, { quest: 1, bossDead: true }).at(-1), a.lines.at(-1).text);
  assert.equal(R.storyQuote(a.quotes, {}), 'Vim procurar trabalho. Só isso.');
  assert.equal(R.storyQuote(a.quotes, { bossDead: true }), 'Trabalho não falta. Isso eu garanto.');
  for (const id of IDS) {
    const st = D.HERO_STORY[id];
    assert.ok(R.storyLines(st.lines, {}).length >= 1 && R.storyQuote(st.quotes, {}), id);
    for (const l of [...st.lines, ...st.quotes]) assert.ok(!/—|Velkor|Morvath|Irmandade|dragão|Sindarin/i.test(l.text), l.text);
    // short sentences, one per line, so the sheet never scrolls
    for (const l of st.lines) assert.ok(l.text.length <= 80 && l.text.split(/[.!?](\s|$)/).filter(x => x && x.trim()).length === 1, l.text);
  }
});

test('the bag groups consumables, equipment and key items; the letter keeps its sealed name', () => {
  const g = R.bagGroups({ inv: { pocao: 3, eter: 0 }, key: { carta: true }, owned: ['espadaFerro'], items: D.ITEMS, equips: D.EQUIPS, keyItems: D.KEY_ITEMS, read: false });
  assert.deepEqual(g.map(x => x.title), ['Consumíveis', 'Equipamentos', 'Itens-chave']);
  assert.deepEqual(g[0].cells.map(c => [c.id, c.n]), [['pocao', 3]]);
  assert.equal(g[2].cells[0].name, D.KEY_ITEMS.carta.sealedName);
  assert.deepEqual(R.bagGroups({ inv: {}, key: {}, owned: [], items: D.ITEMS, equips: D.EQUIPS, keyItems: D.KEY_ITEMS }), []);
  // the Bolsa screen always has its three tabs, empty or not
  assert.deepEqual(R.bagTabs({ inv: {}, key: {}, owned: [], items: D.ITEMS, equips: D.EQUIPS, keyItems: D.KEY_ITEMS }).map(t => [t.title, t.cells.length]),
    [['Consumíveis', 0], ['Equipamentos', 0], ['Itens-chave', 0]]);
  // equipment: who can use it and who is using it (the choice, or the strongest)
  const eq = R.bagTabs({ inv: {}, key: {}, owned: ['espadaFerro', 'espadaPrata', 'cajadoRunico'], items: D.ITEMS, equips: D.EQUIPS, keyItems: D.KEY_ITEMS, equip: { aldo: { arma: 'espadaFerro' } } })[1].cells;
  assert.deepEqual(eq.map(c => [c.id, c.who, c.inUse]), [['espadaFerro', 'aldo', true], ['espadaPrata', 'aldo', false], ['cajadoRunico', 'lyra', true]]);
});

test('layout: two columns on wide screens, tabs on phones; text never under the minimum', () => {
  for (const [w, h, mode] of [[1280, 720, 'cols'], [1440, 900, 'cols'], [1920, 1080, 'cols'], [1366, 768, 'cols'], [390, 844, 'tabs'], [844, 390, 'tabs']]) {
    assert.equal(R.heroViewMode(w, h), mode, `${w}x${h}`);
    const dpr = w < 900 || h < 500 ? 3 : 1, f = R.heroViewFonts(w, h, dpr);
    assert.ok(f.body >= 12, `${w}x${h} body ${f.body}`);
    assert.equal((f.body * dpr) % 8, 0, `${w}x${h}: the font stays on its 8 px grid`);
    assert.ok(f.big >= f.body);
  }
  assert.ok(R.heroViewFonts(1280, 720).body >= 16);
  assert.deepEqual(R.heroViewViews('cols'), [], 'stage and sheet side by side');
  assert.deepEqual(R.heroViewViews('tabs'), ['stage', 'sheet'], 'Palco and Ficha on a phone');
});

test('book: which skills work outside battle, the Usar button grey with the reason, effects in simple numbers', () => {
  const S = D.SPELLS, teo = { hp: 30, mp: 5 };
  assert.deepEqual(R.fieldUse(S.cura, teo), { field: true, ok: true, why: '' });
  assert.deepEqual(R.fieldUse(S.curaTotal, teo), { field: true, ok: false, why: 'Faltam 5 PM' });
  assert.equal(R.fieldUse(S.cura, { hp: 0, mp: 20 }).ok, false);
  assert.deepEqual(R.fieldUse(S.fogo, teo), { field: false, ok: false, why: 'Só em batalha' });
  const fieldIds = Object.keys(S).filter(k => R.fieldUse(S[k], { hp: 1, mp: 99 }).ok);
  assert.deepEqual(fieldIds.sort(), ['cura', 'curaTotal', 'reviver']);
  assert.equal(R.spellEffect(S.cura, { atk: 10, mag: 10 }), 'Recupera cerca de 40 PV');
  assert.equal(R.spellEffect(S.curaTotal, { atk: 10, mag: 10 }), 'Recupera cerca de 30 PV em cada um');
  assert.equal(R.spellEffect(S.golpe, { atk: 20, mag: 0 }), 'Cerca de 28 de dano');
  assert.match(R.spellEffect(S.quebraJunta, { atk: 20, mag: 0 }), /mortos-vivos/);
  for (const [k, sp] of Object.entries(S)) assert.ok(!R.spellEffect(sp, { atk: 10, mag: 10 }).includes('NaN'), k);
});

test('"Próxima técnica": the level of the next skill and a hint without its name; none after the last', () => {
  const aldo = D.PARTY_DEFS.find(d => d.id === 'aldo'), teo = D.PARTY_DEFS.find(d => d.id === 'teo');
  assert.deepEqual(R.nextSkill(aldo.spells, 5, D.SPELLS), { lv: 6, hint: 'Um golpe contra um inimigo.' });
  assert.deepEqual(R.nextSkill(aldo.spells, 6, D.SPELLS), { lv: 12, hint: 'Um golpe contra todos os inimigos.' });
  assert.equal(R.nextSkill(aldo.spells, 12, D.SPELLS), undefined);
  assert.equal(R.nextSkill(teo.spells, 4, D.SPELLS).hint, 'Uma bênção que levanta um aliado caído.');
  for (const d of D.PARTY_DEFS) for (const [lv] of d.spells) {
    const n = R.nextSkill(d.spells, lv - 1, D.SPELLS);
    assert.ok(n && !/undefined|—/.test(n.hint), `${d.id} ${lv}`);
  }
});

test('dialog plaque: every hero name in its own color reads on the dark plaque (contrast 4.5 or more)', () => {
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ink = require('fs').readFileSync(require('path').join(__dirname, '../style.css'), 'utf8').match(/--ink: (#[0-9a-f]{6})/)[1];
  for (const d of D.PARTY_DEFS) assert.ok((lum(d.color) + 0.05) / (lum(ink) + 0.05) >= 4.5, d.id);
});
