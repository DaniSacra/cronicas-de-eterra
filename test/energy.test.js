const test = require('node:test');
const assert = require('node:assert/strict');
const { story, battle, barHero } = require('./harness.js');
const { ENERGY, MAX_LEVEL, PARTY_DEFS, SPELLS } = require('../src/data.js');
const { rollHit, critChance } = require('../src/uirules.js');

// ---------- Rules and data ----------
test('Energia: the constants, and every skill pays with one resource only', () => {
  assert.deepEqual({ ...ENERGY, hurt: { ...ENERGY.hurt }, crit: { ...ENERGY.crit } },
    { max: 100, start: 10, attack: 15, defend: 10, hurt: { aldo: 8 }, crit: { andilla: 10 }, tiers: [20, 40, 80] });
  for (const id of ['aldo', 'andilla']) {
    const d = PARTY_DEFS.find(p => p.id === id);
    assert.ok(d.energy, id);
    assert.deepEqual([d.base.mp, d.grow.mp], [0, 0], `${id} has no PM`);
    for (const [, sp] of d.spells) {
      assert.ok(ENERGY.tiers.includes(SPELLS[sp].en), `${sp} costs 20, 40 or 80`);
      assert.equal(SPELLS[sp].mp, undefined, `${sp} has no PM cost`);
    }
  }
  for (const id of ['lyra', 'teo']) {
    const d = PARTY_DEFS.find(p => p.id === id);
    assert.ok(!d.energy && d.base.mp > 0, id);
    for (const [, sp] of d.spells) assert.ok(SPELLS[sp].mp > 0 && SPELLS[sp].en === undefined, `${sp} is magic: PM only`);
  }
});

test('resourceOf, spellCost, canPay, pay, gainEnergy and fullRestore', () => {
  const { G, run } = story(['aldo', 'lyra']);
  const [aldo, lyra] = G.party;
  assert.deepEqual(run.json('resourceOf(G.party[0])'), { kind: 'energy', label: 'Energia', cur: 0, max: 100 });
  assert.deepEqual(run.json('resourceOf(G.party[1])'), { kind: 'mp', label: 'PM', cur: lyra.mp, max: run('maxMp(G.party[1])') });
  assert.equal(run('spellCost(SPELLS.furia)'), 80);
  assert.equal(run('spellCost(SPELLS.fogo)'), 4);
  assert.deepEqual(run.json('[costText(SPELLS.golpe), costText(SPELLS.fogo)]'), ['20 de Energia', '4 PM']);
  aldo.en = 19;
  assert.equal(run('canPay(G.party[0], SPELLS.golpe)'), false);
  assert.equal(run('gainEnergy(G.party[0], 15)'), 15);
  assert.equal(run('canPay(G.party[0], SPELLS.golpe)'), true);
  run('pay(G.party[0], SPELLS.golpe)');
  assert.equal(aldo.en, 14);
  assert.equal(run('gainEnergy(G.party[0], 500)'), 86, 'the cap is 100');
  assert.equal(aldo.en, 100);
  assert.equal(run('gainEnergy(G.party[0], -300)'), -100, 'never below 0');
  assert.equal(aldo.en, 0);
  assert.equal(run('gainEnergy(G.party[1], 15)'), 0, 'a PM hero gets no Energia');
  const mp = lyra.mp;
  run('pay(G.party[1], SPELLS.fogo)');
  assert.equal(lyra.mp, mp - 4);
  aldo.hp = 1; aldo.en = 60; lyra.hp = 1; lyra.mp = 0;
  run('G.party.forEach(fullRestore)');
  assert.deepEqual([aldo.hp, aldo.mp, aldo.en], [run('maxHp(G.party[0])'), 0, 0]);
  assert.deepEqual([lyra.hp, lyra.mp, lyra.en], [run('maxHp(G.party[1])'), run('maxMp(G.party[1])'), 0]);
});

test('Energia from an attack: none on a miss or a dodge, +15 on a hit, Andilla +10 more on a crit', () => {
  const { run } = story(['aldo']);
  const seq = vals => { let i = 0; return () => vals[i++]; };
  const gain = (id, vals) => run(`attackEnergy('${id}', '${rollHit(critChance(id), 0, seq(vals))}')`);
  assert.equal(gain('aldo', [0.01]), 0, 'miss');
  assert.equal(gain('aldo', [0.9, 0.01]), 0, 'dodge');
  assert.equal(gain('aldo', [0.9, 0.9, 0.9]), 15, 'hit');
  assert.equal(gain('aldo', [0.9, 0.9, 0.01]), 15, 'Aldo crit: no bonus');
  assert.equal(gain('andilla', [0.9, 0.9, 0.2]), 25, 'Andilla crit');
});

// ---------- In battle ----------
test('battle: Energia starts at 10, attacks, defending and Aldo taking hits fill it, a technique spends it, the end zeroes it', async () => {
  const seen = [];
  let turn = 0;
  const { G, run } = battle(['aldo'], (opts, o, run) => {
    if (barHero(o)) {
      seen.push(run('G.party[0].en')); turn++;
      if (turn === 4) { run('B.enemies.forEach(e => { e.hp = 0; })'); return 'def'; }
      return turn === 1 ? 'atk' : turn === 2 ? 'spell' : 'def';
    }
    if (o.title && o.title.startsWith('Técnica')) seen.push(o.title, opts.map(x => [x.hint, !!x.disabled]));
    return opts.find(x => !x.disabled).value;
  });
  G.party[0].lv = 4;
  await run(`startBattle(['boneco'], false, { surprise: 'normal' })`);
  // 10 at the start; +15 attack and +8 for the hit he took = 33; Golpe Forte -20 and +8 = 21; Defender +10 and +8 = 39
  assert.deepEqual(JSON.parse(JSON.stringify(seen)), [10, 33, 'Técnica de Aldo (Energia 33)', [['20 Energia', false]], 21, 39]);
  assert.equal(G.party[0].en, 0, 'the fight is over: no Energia left');
});

test('battle: a skill the hero cannot pay is grey, and the fight after a flight starts at 10 again', async () => {
  const titles = [], firstBar = [];
  const { G, run } = battle(['aldo'], (opts, o, run) => {
    if (barHero(o)) { firstBar.push(run('G.party[0].en')); return titles.length ? 'run' : 'spell'; }
    titles.push([o.title, opts.map(x => !!x.disabled)]);
    return null; // Esc: back to the bar
  });
  G.party[0].lv = 4;
  assert.equal(await run(`startBattle(['boneco'], false, { surprise: 'normal' })`), 'fled');
  assert.deepEqual(JSON.parse(JSON.stringify(titles[0])), ['Técnica de Aldo (Energia 10)', [true]]);
  assert.equal(G.party[0].en, 0);
  G.party[0].en = 55; // whatever was left, the next fight starts at 10
  firstBar.length = 0;
  assert.equal(await run(`startBattle(['boneco'], false, { surprise: 'normal' })`), 'fled');
  assert.equal(firstBar[0], 10);
});

// ---------- Saves and the level cap ----------
test('saves: Energia is never saved; an old save with Aldo at 8 PM loads with 0 PM and 0 Energia; a new save round-trips', () => {
  const { run } = story(['aldo']);
  const old = { id: 'aldo', lv: 4, xp: 10, hp: 70, mp: 8, bonus: { def: 6 } };
  assert.deepEqual(run.json(`loadMember(${JSON.stringify(old)}, 2)`), { ...old, mp: 0, en: 0, bonus: { def: 15 } });
  const lyra = { id: 'lyra', lv: 4, xp: 3, hp: 40, mp: 22, bonus: { mag: 6 } };
  assert.deepEqual(run.json(`loadMember(${JSON.stringify(lyra)}, 3)`), { ...lyra, en: 0 });
  for (const rec of [{ ...old, mp: 0, bonus: { def: 15 } }, lyra]) {
    assert.deepEqual(run.json(`saveMember(loadMember(${JSON.stringify(rec)}, 3))`), rec, 'save, load, save: the same record');
    assert.ok(!('en' in run.json(`saveMember({ ...${JSON.stringify(rec)}, en: 70 })`)), 'en never goes into the save');
  }
});

test('MAX_LEVEL: from 29 a hero stops at 30, gains no more XP and the bar reads Nível máximo', () => {
  assert.equal(MAX_LEVEL, 30);
  const { G, run } = story(['aldo']);
  const m = G.party[0];
  m.lv = 29; m.xp = 0;
  const ups = run.json('gainXp(G.party[0], 1e9)');
  assert.deepEqual(ups.map(u => u.lv), [30]);
  assert.deepEqual([m.lv, m.xp], [30, 0]);
  assert.deepEqual(run.json('gainXp(G.party[0], 500)'), []);
  assert.deepEqual([m.lv, m.xp], [30, 0]);
  const fs = require('node:fs');
  assert.match(fs.readFileSync(`${__dirname}/../src/equipview.js`, 'utf8'), /m\.lv >= MAX_LEVEL \? 'Nível máximo'/);
});

test('nothing outside the resource functions reads a spell PM cost or a hero PM to pay', () => {
  const fs = require('node:fs');
  for (const f of ['battle', 'equipview', 'macro', 'main', 'town', 'chapter1', 'opening', 'devstart', 'ui']) {
    const src = fs.readFileSync(`${__dirname}/../src/${f}.js`, 'utf8');
    assert.ok(!/sp\.mp|SPELLS\[[^\]]+\]\.mp|one\.mp|m\.mp = maxMp/.test(src), f);
  }
});
