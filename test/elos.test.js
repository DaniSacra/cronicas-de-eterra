const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/elos.js');
const { ELOS, PARTY_DEFS, SPELLS } = require('../src/data.js');
const { battle, barHero } = require('./harness.js');

// An action as the battle records it
const act = (actorId, spellId, targets, dealt = {}, heal = {}) => ({ actorId, spellId, targets, dealt, healed: heal.healed || 0, healTarget: heal.to ?? null });
const golpe = (t = '0', d = 40) => act('aldo', 'golpe', [t], { [t]: d });
const fogo = (t = '0', d = 30) => act('lyra', 'fogo', [t], { [t]: d });

// ---------- Data ----------
test('ELOS: every hero and skill exists, and each skill is in that hero list', () => {
  for (const [id, e] of Object.entries(ELOS)) {
    assert.equal(e.heroes.length, 2, id);
    for (const h of e.heroes) {
      const d = PARTY_DEFS.find(p => p.id === h);
      assert.ok(d, `${id}: ${h}`);
      assert.ok(e.parts[h].length, `${id}: ${h} has a part`);
      for (const sp of e.parts[h]) { assert.ok(SPELLS[sp], `${id}: ${sp}`); assert.ok(d.spells.some(([, s]) => s === sp), `${id}: ${h} learns ${sp}`); }
    }
    for (const k of ['name', 'asks', 'does', 'hint']) assert.ok(e[k] && !e[k].includes('—'), `${id}.${k}`);
  }
  assert.ok(!ELOS.lequeBencao.parts.teo.includes('curaTotal'), 'Cura Total does not complete the Leque Abençoado');
});

// ---------- Rules ----------
test('an Elo completes in either order, on the same target, once per round', () => {
  for (const [a, b] of [[golpe(), fogo()], [fogo(), golpe()]]) {
    const r = E.eloRound();
    assert.equal(E.linkElo(r, ELOS, a), null, 'the first one prepares');
    const done = E.linkElo(r, ELOS, b);
    assert.equal(done.id, 'espadaFogo');
    assert.deepEqual(done.targets, ['0']);
    assert.equal(E.linkElo(r, ELOS, golpe()), null);
    assert.equal(E.linkElo(r, ELOS, fogo()), null, 'already fired this round');
  }
});

test('no Elo on another target; an area skill counts as hitting everyone', () => {
  const r = E.eloRound();
  E.linkElo(r, ELOS, golpe('0'));
  assert.equal(E.linkElo(r, ELOS, fogo('1')), null);
  const r2 = E.eloRound();
  E.linkElo(r2, ELOS, act('aldo', 'furia', ['0', '1', '2'], { 0: 20, 1: 20, 2: 20 }));
  assert.deepEqual(E.linkElo(r2, ELOS, fogo('2')).targets, ['2']);
});

test('a preparation is lost when its target dies, when the hero falls, and at the end of the round', () => {
  const r = E.eloRound();
  E.linkElo(r, ELOS, golpe('0'));
  assert.equal(E.linkElo(r, ELOS, fogo('0'), t => t !== '0'), null, 'the target died');
  const r2 = E.eloRound();
  E.linkElo(r2, ELOS, golpe('0'));
  E.dropElo(r2, 'aldo');
  assert.equal(E.linkElo(r2, ELOS, fogo('0')), null, 'Aldo fell');
  const r3 = E.eloRound();
  E.linkElo(r3, ELOS, golpe('0'));
  assert.equal(E.linkElo(E.eloRound(), ELOS, fogo('0')), null, 'a new round');
  const r4 = E.eloRound();
  E.linkElo(r4, ELOS, golpe('0'));
  E.linkElo(r4, ELOS, golpe('1'));
  assert.equal(E.linkElo(r4, ELOS, fogo('0')), null, 'a new preparation replaces the old one');
});

test('the wrong skills complete nothing: Fogo with no technique, Cura Total with the Leque', () => {
  const r = E.eloRound();
  E.linkElo(r, ELOS, act('aldo', 'golpe', null)); // not an enemy skill: never happens, but harmless
  const r2 = E.eloRound();
  E.linkElo(r2, ELOS, fogo());
  assert.equal(E.linkElo(r2, ELOS, act('lyra', 'fogo', ['0'])), null, 'Fogo twice');
  const r3 = E.eloRound();
  E.linkElo(r3, ELOS, act('teo', 'curaTotal', null, {}, { healed: 30 }));
  assert.equal(E.linkElo(r3, ELOS, act('andilla', 'leque', ['0', '1'], { 0: 10, 1: 10 })), null);
  const r4 = E.eloRound();
  E.linkElo(r4, ELOS, act('teo', 'cura', null, {}, { healed: 40, to: 'm' }));
  assert.equal(E.linkElo(r4, ELOS, act('andilla', 'leque', ['0', '1'], { 0: 10, 1: 10 })).id, 'lequeBencao');
});

test('bonus: Espada de Fogo is 25% of both damages on the target (at least 1); Leque Abençoado hits each enemy and heals the others', () => {
  const r = E.eloRound();
  E.linkElo(r, ELOS, golpe('0', 40));
  const done = E.linkElo(r, ELOS, fogo('0', 30));
  assert.deepEqual(E.eloBonus(ELOS.espadaFogo, done), { hits: [{ target: '0', dmg: 18 }], heals: null });
  const tiny = E.eloRound();
  E.linkElo(tiny, ELOS, golpe('0', 1));
  assert.equal(E.eloBonus(ELOS.espadaFogo, E.linkElo(tiny, ELOS, fogo('0', 1))).hits[0].dmg, 1);
  const b = E.eloRound();
  E.linkElo(b, ELOS, act('andilla', 'leque', ['0', '1'], { 0: 20, 1: 12 }));
  const d2 = E.linkElo(b, ELOS, act('teo', 'cura', null, {}, { healed: 50, to: 'aldo' }));
  assert.deepEqual(E.eloBonus(ELOS.lequeBencao, d2, t => t !== '1'), { hits: [{ target: '0', dmg: 5 }], heals: { amount: 30, except: 'aldo' } });
});

test('the card glow only for a known Elo', () => {
  const r = E.eloRound();
  E.linkElo(r, ELOS, golpe());
  assert.deepEqual(E.eloReady(r, ELOS, {}), []);
  assert.deepEqual(E.eloReady(r, ELOS, { espadaFogo: true }), ['aldo']);
});

test('the Sineiro lock: nothing before him, open in his fight, after him and for chapter 1 saves', () => {
  assert.equal(E.elosOpen({ bossDead: false, chapter: 0 }), false, 'prologue save');
  assert.equal(E.elosOpen({ bossDead: false }, true), true, 'the Sineiro fight');
  assert.equal(E.elosOpen({ bossDead: true, chapter: 0 }), true, 'Sineiro down');
  assert.equal(E.elosOpen({ chapter: 1 }), true, 'a chapter 1 save');
  assert.equal(E.eloBookOpen({ chapter: 0, seen: {} }), false);
  assert.equal(E.eloBookOpen({ chapter: 0, seen: { elos: { espadaFogo: true } } }), true, 'found in the Sineiro fight');
});

test('the discovery scene names each hero right, whoever acted first', () => {
  const s = E.eloScene(ELOS.lequeBencao, id => ({ andilla: 'Andilla', teo: 'Teo' })[id]);
  assert.deepEqual(s[0], [null, 'Teo ergue as mãos e a bênção sobe junto com as facas de Andilla.']);
  assert.deepEqual(s.map(x => x[0]), [null, 'andilla', 'teo', null]);
  assert.equal(s.at(-1)[1], 'Elo descoberto: Leque Abençoado.');
});

// ---------- In battle ----------
// Round 1 Aldo attacks (20 Energia); round 2 both use their skill on the dummy: Lyra first, or Aldo when he is faster
async function fireFight(extra, aldoFirst = false) {
  let bars = 0;
  const b = battle(['aldo', 'lyra'], (opts, o, run) => {
    const h = barHero(o);
    if (h) {
      const round = Math.ceil(++bars / 2);
      if (round === 3) { run('B.enemies.forEach(e => { e.hp = 0; })'); return 'def'; }
      if (round === 1) return h === 'aldo' ? 'atk' : 'def';
      return 'spell';
    }
    return (opts.find(x => !x.disabled) || opts[0]).value;
  }, extra);
  b.G.party[0].lv = 4; b.G.party[1].lv = 4;
  if (aldoFirst) b.G.party[0].bonus.agi = 30;
  b.run('G.party.forEach(fullRestore)');
  await b.run(`startBattle(['boneco'], false, { surprise: 'normal' })`);
  return b;
}

test('battle: before the Sineiro no Elo; after him the Elo fires once with its scene, then only the short line', async () => {
  const before = await fireFight({ bossDead: false, chapter: 0 });
  assert.ok(!before.log.some(l => l.includes('Elo')), 'nothing before the Sineiro');
  const after = await fireFight({ bossDead: true, chapter: 1 });
  assert.ok(after.log.includes('Elo descoberto: Espada de Fogo.'));
  assert.ok(after.log.includes('Elo! Espada de Fogo!'));
  assert.equal(after.G.seen.elos.espadaFogo, true);
  const again = await fireFight({ bossDead: true, chapter: 1, seen: { elos: { espadaFogo: true } } }, true);
  assert.ok(again.log.indexOf('Aldo usa Golpe Forte em Boneco!') < again.log.indexOf('Lyra usa Fogo em Boneco!'), 'Aldo acted first');
  assert.ok(again.log.includes('Elo! Espada de Fogo!'));
  assert.ok(!again.log.includes('Elo descoberto: Espada de Fogo.'), 'the scene plays once');
});
