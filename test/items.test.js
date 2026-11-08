const test = require('node:test');
const assert = require('node:assert/strict');
const { story } = require('./harness.js');

test('an item that would do nothing is kept, with the reason', () => {
  const { G, run } = story(['aldo', 'lyra'], { inv: { pocao: 1, eter: 1, pena: 1, elixir: 1 } });
  const use = (id, i) => run(`applyItem('${id}', G.party[${i}])`);
  assert.equal(use('eter', 1), 'Lyra já está com os PM cheios.');
  assert.equal(use('eter', 0), 'Aldo não usa PM. O éter não tem efeito.');
  assert.equal(use('pocao', 1), 'Lyra já está com os PV cheios.');
  assert.equal(use('pena', 0), 'Aldo não precisa disso.');
  assert.equal(run(`applyItem('elixir', 'all')`), 'O grupo já está inteiro. O Elixir fica guardado.');
  assert.deepEqual({ ...G.inv }, { pocao: 1, eter: 1, pena: 1, elixir: 1 }, 'nothing was spent');
});

test('an item that helps is spent and says how much', () => {
  const { G, run } = story(['aldo', 'lyra'], { inv: { pocao: 1, eter: 2, pena: 1 } });
  const [, lyra] = G.party;
  lyra.mp = 0; lyra.hp = 5;
  assert.equal(run(`applyItem('eter', G.party[1])`), `Lyra recupera ${lyra.mp} PM.`);
  assert.ok(lyra.mp > 0);
  assert.match(run(`applyItem('pocao', G.party[1])`), /^Lyra recupera \d+ PV\.$/);
  lyra.hp = 0;
  assert.equal(run(`applyItem('eter', G.party[1])`), 'Lyra caiu. O éter não tem efeito.');
  assert.equal(run(`applyItem('pena', G.party[1])`), 'Lyra voltou à vida!');
  assert.deepEqual({ ...G.inv }, { pocao: 0, eter: 1, pena: 0 });
});

test('review 2026-11-07 (2): the forge sells weak gear; a hero wears the strongest piece of each slot and bonuses never stack', async () => {
  const { bestGear, equipDelta, gearPower } = require('../src/uirules.js');
  const { EQUIPS } = require('../src/data.js');
  assert.deepEqual(equipDelta('espadaCurta', [], EQUIPS), { atk: 3 });
  assert.deepEqual(equipDelta('espadaFerro', ['espadaCurta'], EQUIPS), { atk: 3 }, 'the crypt sword replaces the bought one: +6 in all');
  assert.deepEqual(equipDelta('espadaCurta', ['espadaFerro'], EQUIPS), {}, 'a weaker piece changes nothing');
  assert.equal(bestGear('aldo', 'arma', ['espadaFerro', 'espadaCurta'], EQUIPS), 'espadaFerro');
  // every forge piece is weaker than the crypt piece of the same hero and slot
  for (const [weak, strong] of [['espadaCurta', 'espadaFerro'], ['cajadoFreixo', 'cajadoRunico']]) assert.ok(gearPower(EQUIPS[weak]) < gearPower(EQUIPS[strong]));

  const { G, log, run, picks } = story(['aldo', 'lyra'], { gold: 100, gear: [] });
  // the forge window (src/equipview.js) buys through buyGear: here the player buys the Espada Curta and wears it
  run(`globalThis.HeroView = { owned: () => [...G.gear], show: async (s, o) => { globalThis.forgeShop = o.shop; buyGear('espadaCurta', true, [...G.gear]); } }`);
  run(`enterTown({ x: 26, y: 6, dir: 0 }, 'valmor')`);
  picks.push('buy', null);
  await run(`enterBuilding(BUILDINGS.find(b => b.id === 'smith'))`);
  assert.ok(run.json('forgeShop').items.every(([id]) => ['aldo', 'lyra'].includes(run(`EQUIPS['${id}'].who`))), 'only gear for the heroes in the party');
  assert.equal(G.gold, 40);
  assert.deepEqual([...G.gear], ['espadaCurta']);
  assert.equal(G.party[0].bonus.atk, 3);
  assert.equal(run("forgeCompare('espadaCurta', G.gear, EQUIPS, STAT_NAMES).ok"), false, 'no second copy');
});

test('equipment choice: the strongest by default (old saves too), a chosen piece stays worn, Melhor picks the strongest', () => {
  const R = require('../src/uirules.js');
  const { EQUIPS } = require('../src/data.js');
  const owned = ['espadaFerro', 'espadaCurta', 'cotaMalha'];
  assert.equal(R.equippedGear('aldo', 'arma', owned, EQUIPS), 'espadaFerro', 'no choice (old save): the strongest');
  assert.equal(R.equippedGear('aldo', 'arma', owned, EQUIPS, { aldo: { arma: 'espadaCurta' } }), 'espadaCurta');
  assert.equal(R.equippedGear('aldo', 'arma', ['espadaFerro'], EQUIPS, { aldo: { arma: 'espadaCurta' } }), 'espadaFerro', 'a choice no longer owned falls back');
  const list = R.gearChoices('aldo', 'arma', owned, EQUIPS, { aldo: { arma: 'espadaCurta' } });
  assert.deepEqual(list.map(c => [c.id, c.equipped, c.diff]), [['espadaFerro', false, { atk: 3 }], ['espadaCurta', true, {}]]);
  assert.deepEqual(R.bestChoice('aldo', owned, EQUIPS), { arma: 'espadaFerro', armadura: 'cotaMalha' });
  assert.deepEqual(R.bonusDiff('espadaCurta', 'espadaFerro', EQUIPS), { atk: -3 });
  assert.deepEqual(R.equipDelta('espadaPrata', owned, EQUIPS, { aldo: { arma: 'espadaCurta' } }), { atk: 7 }, 'against what is worn, not the best owned');
  const pal = R.bodyPal({ g: 'x' }, 'aldo', ['espadaFerro', 'espadaPrata'], EQUIPS, { espadaFerro: { g: 'ferro' }, espadaPrata: { g: 'prata' } }, { aldo: { arma: 'espadaFerro' } });
  assert.equal(pal.g, 'ferro', 'the weapon in hand is the one worn');
  const bag = R.bagGroups({ inv: {}, key: {}, owned, items: {}, equips: EQUIPS, keyItems: {}, equip: {} }).find(g => g.title === 'Equipamentos').cells;
  assert.deepEqual(bag.map(c => [c.id, c.who, c.inUse]), [['espadaFerro', 'aldo', true], ['espadaCurta', 'aldo', false], ['cotaMalha', 'aldo', true]]);
});

test('the red dots: a skill learned or a note added shows one until the Livro or the Diário is opened; the list goes in the save', () => {
  const { G, run } = story(['aldo', 'lyra']);
  assert.deepEqual(run.json('menuDots()'), { book: false, diary: false }, 'a new game starts with nothing new');
  assert.ok(G.seen.bookRead.includes('aldo:golpe'));
  run('G.party[0].lv = 6');
  assert.deepEqual(run.json('menuDots()'), { book: true, diary: false }, 'Quebra-Junta at level 6');
  G.seen.job = 1;
  assert.deepEqual(run.json('menuDots()'), { book: true, diary: true }, 'a note from the Berta');
  run("markRead('book')");
  assert.deepEqual(run.json('menuDots()'), { book: false, diary: true });
  run("markRead('diary')");
  assert.deepEqual(run.json('menuDots()'), { book: false, diary: false });
  const saved = JSON.parse(JSON.stringify(G.seen));
  assert.ok(saved.bookRead.includes('aldo:quebraJunta') && saved.diaryRead.length, 'G.seen goes in the save as it is');
});

test('target cards: the preview of each consumable and the reason a hero is greyed out', () => {
  const { G, run } = story(['aldo', 'lyra', 'teo', 'andilla']);
  const pv = (id, i) => run.json(`previewFor(ITEMS.${id}.fx, G.party[${i}])`);
  const max = i => run(`maxHp(G.party[${i}])`);
  G.party[1].hp = 20; G.party[3].hp = 0; G.party[2].mp = 1;
  assert.equal(pv('pocao', 0).why, 'PV cheio');
  assert.deepEqual(pv('pocao', 1), { ok: true, gain: Math.min(50, max(1) - 20), text: `20/${max(1)} +${Math.min(50, max(1) - 20)} → ${Math.min(max(1), 70)}/${max(1)}` });
  assert.equal(pv('pocao', 3).why, 'Caído');
  assert.equal(pv('pao', 0).why, 'PV cheio');
  assert.equal(pv('eter', 0).why, 'Não usa PM', 'Aldo fights with Energia');
  assert.equal(pv('eter', 1).why, 'PM cheio');
  assert.ok(pv('eter', 2).ok);
  assert.equal(pv('pena', 0).why, 'De pé');
  assert.equal(pv('pena', 3).text, `0/${max(3)} → ${Math.floor(max(3) / 2)}/${max(3)}`);
  assert.equal(run('groupNeeds(ITEMS.elixir.fx)'), true);
});

test('no item is ever spent on a greyed-out hero, and a lit one gets exactly what its card promised', () => {
  const { G, run } = story(['aldo', 'lyra', 'teo', 'andilla']);
  for (const id of ['pocao', 'pao', 'eter', 'pena']) for (const hp of [0, 10, 'max']) for (let i = 0; i < 4; i++) {
    G.party.forEach(m => { m.hp = run(`maxHp(G.party[${G.party.indexOf(m)}])`); m.mp = 0; });
    G.party[i].hp = hp === 'max' ? run(`maxHp(G.party[${i}])`) : hp;
    G.inv = { [id]: 2 };
    const v = run.json(`previewFor(ITEMS.${id}.fx, G.party[${i}])`), before = { hp: G.party[i].hp, mp: G.party[i].mp };
    run(`applyItem('${id}', G.party[${i}])`);
    const tag = `${id} on ${G.party[i].id} at ${hp}`;
    assert.equal(G.inv[id], v.ok ? 1 : 2, tag);
    if (v.ok && v.gain) assert.equal(id === 'eter' ? G.party[i].mp - before.mp : G.party[i].hp - before.hp, v.gain, tag);
  }
});

test('the Cura of the Livro outside battle follows the same cards: full or fallen heroes are greyed out', () => {
  const { G, run } = story(['aldo', 'teo']);
  const fx = run.json('spellFx(SPELLS.cura, G.party[1])');
  assert.equal(fx.hp, run('Math.round(stat(G.party[1], "mag") * SPELLS.cura.power + SPELLS.cura.base)'));
  assert.equal(run.json('previewFor(spellFx(SPELLS.cura, G.party[1]), G.party[0])').why, 'PV cheio');
  G.party[0].hp = 0;
  assert.equal(run.json('previewFor(spellFx(SPELLS.cura, G.party[1]), G.party[0])').why, 'Caído');
  assert.ok(run.json('previewFor(spellFx(SPELLS.reviver, G.party[1]), G.party[0])').ok);
  G.party[0].hp = 5;
  assert.ok(run.json('previewFor(spellFx(SPELLS.cura, G.party[1]), G.party[0])').text.startsWith('5/'));
  assert.equal(run('groupNeeds(spellFx(SPELLS.curaTotal, G.party[1]))'), true);
  G.party[0].hp = run('maxHp(G.party[0])');
  assert.equal(run('groupNeeds(spellFx(SPELLS.curaTotal, G.party[1]))'), false, 'everyone full: Cura Total greyed out');
});
