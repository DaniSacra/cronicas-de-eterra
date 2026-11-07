const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const M = require('../src/macro.js');
const { battle, barHero } = require('./harness.js');

// ---------- Pure rules ----------
const SPELLS = {
  fogo: { name: 'Fogo', mp: 4, target: 'enemy', kind: 'mag', fx: 'fire' },
  gelo: { name: 'Gelo', mp: 8, target: 'allEnemies', kind: 'mag', fx: 'ice' },
  cura: { name: 'Cura', mp: 3, target: 'ally', kind: 'heal' },
  reviver: { name: 'Reviver', mp: 12, target: 'deadAlly', kind: 'revive' },
  golpe: { name: 'Golpe Forte', mp: 4, target: 'enemy', kind: 'phys', fx: 'slash' },
};
const ITEMS = { pocao: { name: 'Poção', target: 'ally' }, eter: { name: 'Éter', target: 'ally' }, pena: { name: 'Pena Vital', target: 'deadAlly' } };
const hero = (id, hp, mp = 10) => ({ id, hp, mp, max: 100 });
const ctx = (actor, o = {}) => ({
  actor, name: actor.id, party: o.party || [actor], enemies: o.enemies || [{ i: 0, hp: 10, x: 50 }, { i: 1, hp: 10, x: 20 }],
  inv: o.inv || { pocao: 1, eter: 1, pena: 1 }, spells: SPELLS, items: ITEMS, maxHp: m => m.max, maxMp: () => 20,
  useless: o.useless || (() => null),
});

test('a chosen command becomes a rule: enemy by index, run kept as an attack, allies never stored', () => {
  assert.deepEqual(M.macroEntry({ type: 'attack', target: { i: 2, hp: 5 } }), { type: 'attack', enemy: 2 });
  assert.deepEqual(M.macroEntry({ type: 'run' }), { type: 'attack' });
  assert.deepEqual(M.macroEntry({ type: 'defend' }), { type: 'defend' });
  assert.deepEqual(M.macroEntry({ type: 'spell', spell: 'cura', target: { id: 'teo', hp: 3 } }), { type: 'spell', spell: 'cura' });
  assert.deepEqual(M.macroEntry({ type: 'item', item: 'pocao', target: 'all' }), { type: 'item', item: 'pocao' });
});

test('closing a round: a complete round replaces the last one, a cut round only updates who acted, an empty one keeps it', () => {
  const last = { aldo: { type: 'attack' }, teo: { type: 'defend' } };
  assert.deepEqual(M.closeRound(last, { aldo: { type: 'defend' } }, true), { aldo: { type: 'defend' } }, 'the fallen Teo is not in it');
  assert.deepEqual(M.closeRound(last, { aldo: { type: 'defend' } }, false), { aldo: { type: 'defend' }, teo: { type: 'defend' } });
  assert.equal(M.closeRound(last, {}, true), last);
  assert.equal(M.closeRound(null, {}, true), null);
});

test('targets: same enemy while alive, else the leftmost; area for all', () => {
  const a = hero('aldo', 50);
  assert.equal(M.resolveMacro({ type: 'attack', enemy: 0 }, ctx(a)).cmd.target.i, 0);
  const dead0 = [{ i: 0, hp: 0, x: 5 }, { i: 1, hp: 10, x: 80 }, { i: 2, hp: 10, x: 40 }];
  assert.equal(M.resolveMacro({ type: 'attack', enemy: 0 }, ctx(a, { enemies: dead0 })).cmd.target.i, 2, 'leftmost living one');
  assert.equal(M.resolveMacro({ type: 'spell', spell: 'gelo' }, ctx(a)).cmd.target, 'all');
  assert.equal(M.resolveMacro({ type: 'spell', spell: 'fogo', enemy: 0 }, ctx(a, { enemies: dead0 })).cmd.target.i, 2);
});

test('healing goes to the living ally with the lowest HP share; Éter to the lowest MP share', () => {
  const teo = hero('teo', 90), aldo = hero('aldo', 40), lyra = hero('lyra', 30, 2);
  lyra.max = 50; // 60%: more hurt in points, less in share than Aldo (40%)
  const fallen = hero('andilla', 0);
  const party = [teo, aldo, lyra, fallen];
  assert.equal(M.resolveMacro({ type: 'spell', spell: 'cura' }, ctx(teo, { party })).cmd.target, aldo);
  assert.equal(M.resolveMacro({ type: 'item', item: 'pocao' }, ctx(teo, { party })).cmd.target, aldo);
  assert.equal(M.resolveMacro({ type: 'item', item: 'eter' }, ctx(teo, { party })).cmd.target, lyra);
});

test('revive and Pena Vital: the first fallen ally, or Defend when nobody fell', () => {
  const teo = hero('teo', 90, 20), aldo = hero('aldo', 0), lyra = hero('lyra', 0);
  const r = M.resolveMacro({ type: 'spell', spell: 'reviver' }, ctx(teo, { party: [teo, aldo, lyra] }));
  assert.equal(r.cmd.target, aldo);
  assert.equal(M.resolveMacro({ type: 'item', item: 'pena' }, ctx(teo, { party: [teo, lyra] })).cmd.target, lyra);
  const none = M.resolveMacro({ type: 'spell', spell: 'reviver' }, ctx(teo, { party: [teo] }));
  assert.equal(none.cmd.type, 'defend');
  assert.equal(none.warn, 'Ninguém caído. teo se defende.');
});

test('substitutions: no item in the bag, not enough MP, an item that would do nothing', () => {
  const aldo = hero('aldo', 50), lyra = hero('lyra', 50, 2);
  const noItem = M.resolveMacro({ type: 'item', item: 'pocao' }, ctx(aldo, { inv: {} }));
  assert.equal(noItem.cmd.type, 'defend');
  assert.equal(noItem.warn, 'Sem Poção na bolsa. aldo se defende.');
  const noMp = M.resolveMacro({ type: 'spell', spell: 'fogo', enemy: 1 }, ctx(lyra));
  assert.deepEqual([noMp.cmd.type, noMp.cmd.target.i, noMp.warn], ['attack', 1, 'PM insuficiente. lyra ataca.']);
  const full = M.resolveMacro({ type: 'item', item: 'pocao' }, ctx(aldo, { useless: () => 'aldo já está com os PV cheios.' }));
  assert.deepEqual([full.cmd.type, full.warn], ['defend', 'aldo já está com os PV cheios. aldo se defende.']);
});

test('summary icons follow the party order and skip heroes the tactic does not know', () => {
  const mc = { teo: { type: 'spell', spell: 'cura' }, aldo: { type: 'attack' }, lyra: { type: 'spell', spell: 'fogo' }, andilla: { type: 'item', item: 'pocao' } };
  assert.deepEqual(M.macroIcons(mc, ['aldo', 'lyra', 'teo', 'andilla'], SPELLS), ['atk', 'fogo', 'cura', 'pocao']);
  assert.deepEqual(M.macroIcons({ aldo: { type: 'defend' } }, ['aldo', 'lyra'], SPELLS), ['def'], 'Lyra joined later');
  assert.deepEqual(M.macroIcons(null, ['aldo'], SPELLS), []);
  assert.equal(M.entryIcon({ type: 'spell', spell: 'gelo' }, SPELLS), 'spell');
  assert.equal(M.entryIcon({ type: 'spell', spell: 'golpe' }, SPELLS), 'atk');
});

test('old saves: missing or broken macros become two empty slots; good ones stay', () => {
  assert.deepEqual(M.normalizeMacros(undefined), [null, null]);
  assert.deepEqual(M.normalizeMacros('x'), [null, null]);
  const one = { aldo: { type: 'attack' } };
  assert.deepEqual(M.normalizeMacros([one]), [one, null]);
  assert.deepEqual(M.normalizeMacros(JSON.parse(JSON.stringify([one, one]))), [one, one], 'survives the JSON of a save');
});

test('the tip waits for the 3rd crypt fight, round 2, and never comes to someone who used a tactic', () => {
  assert.equal(M.macroTipDue({ lutasCripta: 3 }, 2, false), true);
  assert.equal(M.macroTipDue({ lutasCripta: 2 }, 2, false), false);
  assert.equal(M.macroTipDue({ lutasCripta: 3 }, 1, false), false);
  assert.equal(M.macroTipDue({ lutasCripta: 3 }, 3, false), false);
  assert.equal(M.macroTipDue({ lutasCripta: 3, macro: 1 }, 2, false), false);
  assert.equal(M.macroTipDue({ lutasCripta: 3, dicaTatica: 1 }, 2, false), false, 'only once');
  assert.equal(M.macroTipDue({ lutasCripta: 3 }, 2, true), false, 'not in the boss fight');
  assert.equal(M.macroTipDue({ lutasCripta: 4 }, 2, false), true, 'a 3rd fight won in one round moves it to the next one');
});

// ---------- The real battle loop ----------
// A scripted player for the real loop: plays `hand` by default; `plan[round][hero]` overrides one bar
function player(hand, plan, end) {
  const bars = [], queue = [];
  const choose = (opts, o, run) => {
    const h = barHero(o);
    if (!h) return queue.length ? queue.shift() : opts.find(x => !x.disabled).value;
    const r = run('B.round');
    bars.push(`${r}:${h}`);
    if (r >= end) { run('B.enemies.forEach(e => { e.hp = 0; })'); return 'def'; }
    const [first, ...rest] = (plan[r] && plan[r][h] && plan[r][h].shift()) || hand[h];
    queue.push(...rest);
    return first;
  };
  return { bars, choose };
}
const start = run => run(`startBattle(['boneco'], false, { surprise: 'normal' })`);

// Round 1 by hand; round 2: Lyra records Tática 1 (G) and plays it (1); round 3: Tática 1 again, stopped with Esc
test('record the last round, replay it for everyone left in the round, and stop it with Esc', async () => {
  const hand = { lyra: ['spell'] /* one spell at level 1: no list */, aldo: ['atk'], teo: ['def'] };
  const p = player(hand, { 2: { lyra: [['macroSave', 0], ['macro1']] }, 3: { lyra: [['macro1']] } }, 4);
  const { G, log, run, ctx } = battle(['aldo', 'lyra', 'teo'], p.choose);
  const logTick = ctx.tick;
  ctx.tick = () => { logTick(); if (run('B && B.round === 3 && B.macro && B.label && B.label.startsWith("Lyra usa Fogo")')) run('stopMacro()'); };
  assert.equal(await start(run), 'win');
  assert.deepEqual(p.bars, ['1:lyra', '1:aldo', '1:teo', '2:lyra', '2:lyra', '3:lyra', '3:aldo', '3:teo', '4:lyra'],
    'round 2: nobody after Lyra is asked; round 3: Esc gives the bar back from Aldo on');
  assert.deepEqual(run.json('G.macros[0]'), { lyra: { type: 'spell', spell: 'fogo', enemy: 0 }, aldo: { type: 'attack', enemy: 0 }, teo: { type: 'defend' } });
  const r2 = log.slice(log.indexOf('Tática 1 gravada.'));
  assert.deepEqual(r2.slice(1, 4), ['Lyra usa Fogo em Boneco!', 'Aldo ataca Boneco!', 'Teo se defende.']);
  assert.ok(log.includes('Tática interrompida.'));
  assert.equal(G.seen.macro, 1);
});

test('Fugir is recorded as an attack and a fallen hero stays out of the round', async () => {
  const p = player({ lyra: ['run'], aldo: ['atk'] }, {}, 9);
  const { G, run } = battle(['aldo', 'lyra', 'teo'], p.choose);
  G.party[2].hp = 0;
  G.lastRound = { aldo: { type: 'defend' }, teo: { type: 'defend' } };
  assert.equal(await start(run), 'fled');
  assert.deepEqual(run.json('G.lastRound'), { aldo: { type: 'defend' }, teo: { type: 'defend' }, lyra: { type: 'attack' } },
    'Lyra fled first: the cut round only updates her');
  const q = player({ lyra: ['def'], aldo: ['atk'] }, {}, 2);
  const b = battle(['aldo', 'lyra', 'teo'], q.choose);
  b.G.party[2].hp = 0;
  await start(b.run);
  assert.deepEqual(Object.keys(b.run.json('G.lastRound')).sort(), ['aldo', 'lyra'], 'a complete round: Teo, fallen, is not in it');
});

test('replaying: no item left, no MP left, and a hero who joined after the recording chooses by hand', async () => {
  const p = player({ lyra: ['def'], aldo: ['def'], teo: ['def'] }, { 1: { lyra: [['macro1']] } }, 2);
  const { G, log, run } = battle(['aldo', 'lyra', 'teo'], p.choose);
  G.inv = {};
  G.party[1].mp = 0;
  G.macros = [{ lyra: { type: 'spell', spell: 'fogo', enemy: 0 }, aldo: { type: 'item', item: 'pocao' } }, null];
  await start(run);
  assert.ok(log.includes('PM insuficiente. Lyra ataca.'));
  assert.ok(log.includes('Lyra ataca Boneco!'));
  assert.ok(log.includes('Sem Poção na bolsa. Aldo se defende.'));
  assert.deepEqual(p.bars, ['1:lyra', '1:teo', '2:lyra'], 'Teo, not in the tactic, gets the bar; Aldo does not');
});

test('the tip: 3rd crypt fight, start of round 2, the bar opening on Tática; never after a tactic was used', async () => {
  const hand = { lyra: ['atk'], aldo: ['atk'], teo: ['def'], andilla: ['atk'] };
  const starts = [];
  const go = async seen => {
    const p = player(hand, {}, 3);
    const b = battle(['aldo', 'lyra', 'teo', 'andilla'], (opts, o, run) => { if (barHero(o)) starts.push(`${run('B.round')}:${o.start}`); return p.choose(opts, o, run); },
      { mode: 'explore', seen });
    await start(b.run);
    return b;
  };
  const { G, log } = await go({ lutasCripta: 2 });
  assert.equal(G.seen.lutasCripta, 3);
  const tip = log.findIndex(t => t.startsWith('Dica: Tática guarda'));
  assert.ok(tip > 0);
  assert.equal(log[tip - 3], 'Lyra:\nEstamos repetindo os mesmos golpes. Podíamos combinar uma tática e só dar o sinal.');
  assert.ok(log.slice(0, tip).includes('Teo se defende.'), 'after round 1');
  assert.deepEqual(starts.filter(s => s.startsWith('2:')).slice(0, 1), ['2:macro'], 'the first bar after the tip sits on Tática');
  assert.equal(G.seen.dicaTatica, 1);
  for (const seen of [{ lutasCripta: 1 }, { lutasCripta: 2, macro: 1 }]) {
    const b = await go(seen);
    assert.ok(!b.log.some(t => t.startsWith('Dica: Tática')), JSON.stringify(seen));
  }
});

test('save keeps both slots; a save from before tactics loads with two empty ones', () => {
  const main = fs.readFileSync(`${__dirname}/../src/main.js`, 'utf8');
  assert.match(main, /seen: G\.seen, macros: G\.macros/);
  assert.match(main, /G\.macros = normalizeMacros\(s\.macros\)/);
});

test('players never read Macro, Auto, Automático or 2x: the feature is called Tática', () => {
  for (const f of ['macro.js', 'battle.js', 'main.js', 'data.js', 'uirules.js']) {
    const strings = fs.readFileSync(`${__dirname}/../src/${f}`, 'utf8').match(/'[^'\n]*'|`[^`\n]*`|"[^"\n]*"/g) || [];
    for (const t of strings) assert.doesNotMatch(t, /\bMacro|\bAuto|Automático|\b2x\b/, `${f}: ${t}`);
  }
  assert.match(M.MACRO_TIP, /Tática/);
  assert.doesNotMatch(M.MACRO_TIP, /—/);
});
