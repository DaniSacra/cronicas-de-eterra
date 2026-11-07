// ===== Combat simulator: the real formulas of the game, simple fixed hero actions =====
// npm run sim [-- fights]  ·  compares Phase 1b (Aldo and Andilla with PM and the old skills table) with Phase 2a
// (Energia and the new table). Hero and enemy numbers come from src/data.js; Phase 1b is the same data with the old
// values of PHASE_1B put back.
//
// Phase 2a, final values (src/data.js), calibrated with this script (power first, then gain):
//   ENERGY = { max: 100, start: 10, attack: 15, defend: 10, hurt: { aldo: 8 }, crit: { andilla: 10 } }  (gain unchanged)
//   Golpe Forte 20 / 1.4 · Quebra-Junta 40 / 1.35 (x1.5 on bone; proposed 2.0) · Fúria 80 / 0.95 each (proposed 1.8)
//   Leque de Facas 20 / 0.71 each (proposed 0.75) · Golpe Baixo 20 / 1.3, ignores Defesa
//   With the proposed powers the steady pace was Quebra-Junta 1.66x, Fúria 1.86x and Leque against 3 1.50x, all over
//   1.45x. Raising Aldo's gain when hit (8 to 12) does not change any fight of the table, so the gain stays.
//
// Hero actions, no items, nobody defends:
//   Aldo (2a): Fúria against 3 or more with 80, Quebra-Junta against the undead with 40, Golpe Forte with 20, else attack.
//   Andilla (2a): Leque against 2 or more with 20, Golpe Baixo with 20 on a target over 15 PV, else attack.
//   Aldo (1b): Quebra-Junta against the undead, Fúria against 3 or more, Golpe Forte; Andilla (1b): Leque, Golpe Baixo.
//   Lyra: Gelo against 2 or more, Raio against a target over 60 PV, Fogo. Teo heals whoever is under half PV and uses
//   Luz Sagrada against the undead. Without PM or Energia, or before learning the skill, a hero attacks.
// Enemies act as in src/battle.js (skills, the boss pattern).
const fs = require('node:fs');
const vm = require('node:vm');
const SRC = `${__dirname}/../src/`;

// What Phase 1b had for the combat heroes (restored in memory for the comparison)
const PHASE_1B = {
  defs: { aldo: { mp: [8, 1], spells: [[1, 'golpe'], [3, 'quebraJunta'], [5, 'furia']] }, andilla: { mp: [10, 2], spells: [[1, 'golpeBaixo'], [3, 'leque']] },
    teo: { spells: [[1, 'cura'], [3, 'luz'], [5, 'reviver'], [7, 'curaTotal']] } },
  spells: { golpe: { mp: 4, power: 1.8 }, quebraJunta: { mp: 5, power: 1.4 }, furia: { mp: 8, power: 1.15 }, golpeBaixo: { mp: 3, power: 1.4 }, leque: { mp: 6, power: 0.8 } },
};

function load(model = '2a') {
  const G = { party: [], inv: {}, seen: {} };
  const ctx = { console, G, UI: new Proxy({}, { get: () => () => {} }), Sfx: new Proxy({}, { get: () => () => {} }) };
  vm.createContext(ctx);
  for (const f of ['palette', 'data', 'uirules', 'party']) vm.runInContext(fs.readFileSync(SRC + f + '.js', 'utf8'), ctx, { filename: f });
  const K = vm.runInContext(`({ G, ENEMIES, SPELLS, EQUIPS, PARTY_DEFS, HIT, ENERGY, stat, maxHp, maxMp, knownSpells, physDmg, magDmg, rollHit,
    critChance, newMember, pdef, rnd, canPay, pay, gainEnergy, attackEnergy, usesEnergy })`, ctx);
  if (model === '1b') {
    for (const [id, o] of Object.entries(PHASE_1B.defs)) {
      const d = K.PARTY_DEFS.find(p => p.id === id);
      if (o.mp) { d.base.mp = o.mp[0]; d.grow.mp = o.mp[1]; delete d.energy; }
      d.spells = o.spells;
    }
    for (const [id, o] of Object.entries(PHASE_1B.spells)) { delete K.SPELLS[id].en; Object.assign(K.SPELLS[id], o); }
  }
  K.model = model;
  return K;
}

// only: { heroId: spellId | 'none' } makes that hero use just that skill whenever it can pay (or never use any).
// endless: a number of rounds against foes that never fall; heroes lose no PV but still gain Energia from the hits,
// and only the heroes in `only` act (the steady pace of a technique, free of how fast a fight ends)
function fight(K, heroes, foes, only = {}, endless = 0) {
  const { stat, maxHp, SPELLS, ENEMIES, HIT, ENERGY, rnd } = K;
  const P = heroes, E = foes.map(id => ({ ...ENEMIES[id], id, maxhp: ENEMIES[id].hp, ...(endless ? { hp: 1e9 } : {}) }));
  const live = a => a.filter(x => x.hp > 0);
  const knows = (m, s) => K.knownSpells(m).includes(s) && K.canPay(m, SPELLS[s]);
  const weakest = () => live(E).sort((a, b) => a.hp - b.hp)[0];
  const stats = Object.fromEntries(P.map(m => [m.id, { dmg: 0, turns: 0, techs: 0 }]));
  const hurt = (m, d) => {
    if (!endless) m.hp = Math.max(0, m.hp - d);
    if (m.hp > 0 && d > 0) K.gainEnergy(m, ENERGY.hurt[m.id] || 0);
    return d;
  };
  const strike = (m, e, d) => { const got = Math.min(e.hp, d); e.hp -= got; stats[m.id].dmg += got; };
  for (const m of P) m.en = K.usesEnergy(m) ? ENERGY.start : 0;
  function cast(m, s, t) {
    const sp = SPELLS[s]; K.pay(m, sp);
    if (sp.kind === 'phys') stats[m.id].techs++;
    if (sp.kind === 'heal') { t.hp = Math.min(maxHp(t), t.hp + Math.round((stat(m, 'mag') * sp.power + sp.base) * rnd(0.9, 1.1))); return; }
    for (const e of sp.target === 'allEnemies' ? live(E) : [t]) {
      let d;
      if (sp.kind === 'phys') d = Math.round(K.physDmg(stat(m, 'atk'), sp.pierce ? 0 : e.def, sp.power) * (sp.bone && e.undead ? sp.bone : 1));
      else { d = K.magDmg((stat(m, 'mag') * sp.power + sp.base) * rnd(0.9, 1.1), e.res); if (sp.kind === 'holy' && e.undead) d *= 2; }
      strike(m, e, d);
    }
  }
  function attack(m, t) {
    const r = K.rollHit(K.critChance(m.id), t.agi);
    K.gainEnergy(m, K.attackEnergy(m.id, r));
    if (r === 'miss' || r === 'dodge') return;
    strike(m, t, K.physDmg(stat(m, 'atk'), t.def, r === 'crit' ? HIT.critMul : 1));
  }
  function heroAct(m) {
    const en = live(E), t = weakest(), many = en.length, o = only[m.id];
    if (o) return o !== 'none' && knows(m, o) ? cast(m, o, t) : attack(m, t);
    if (m.id === 'aldo') {
      if (K.model === '1b' && t.undead && knows(m, 'quebraJunta')) return cast(m, 'quebraJunta', t);
      if (many >= 3 && knows(m, 'furia')) return cast(m, 'furia');
      const dead = en.find(e => e.undead);
      if (K.model === '2a' && dead && knows(m, 'quebraJunta')) return cast(m, 'quebraJunta', dead);
      if (knows(m, 'golpe')) return cast(m, 'golpe', t);
    }
    if (m.id === 'lyra') {
      if (many >= 2 && knows(m, 'gelo')) return cast(m, 'gelo');
      const big = en.find(e => e.hp > 60);
      if (big && knows(m, 'raio')) return cast(m, 'raio', big);
      if (knows(m, 'fogo')) return cast(m, 'fogo', t);
    }
    if (m.id === 'teo') {
      const low = live(P).filter(x => x.hp < maxHp(x) / 2).sort((a, b) => a.hp / maxHp(a) - b.hp / maxHp(b))[0];
      if (low && knows(m, 'cura')) return cast(m, 'cura', low);
      const dead = en.find(e => e.undead);
      if (dead && knows(m, 'luz')) return cast(m, 'luz', dead);
    }
    if (m.id === 'andilla') {
      if (many >= 2 && knows(m, 'leque')) return cast(m, 'leque');
      const big = K.model === '2a' ? en.filter(e => e.hp > 15).sort((a, b) => a.hp - b.hp)[0] : t;
      if (big && knows(m, 'golpeBaixo')) return cast(m, 'golpeBaixo', big);
    }
    attack(m, t);
  }
  function enemyHit(e, t, power = 1) {
    const r = K.rollHit(e.boss ? 0 : HIT.crit, stat(t, 'agi'));
    if (r === 'miss' || r === 'dodge') return 0;
    return hurt(t, K.physDmg(e.atk, stat(t, 'def'), power * (r === 'crit' ? HIT.critMul : 1)));
  }
  function enemyAct(e) {
    const ps = live(P), t = ps[Math.floor(Math.random() * ps.length)];
    if (e.boss) {
      const r = Math.random();
      if (r < 0.38) enemyHit(e, t);
      else if (r < 0.7) ps.forEach(p => hurt(p, K.magDmg(e.chama * rnd(0.85, 1.15), stat(p, 'res'))));
      else { const d = hurt(t, K.magDmg(e.dreno * rnd(0.9, 1.1), stat(t, 'res'))); e.hp = Math.min(e.maxhp, e.hp + d); }
      return;
    }
    const sk = e.skill;
    if (sk && Math.random() < sk.chance) {
      if (sk.kind === 'phys') enemyHit(e, t, sk.power);
      else if (sk.kind === 'drain') { const d = enemyHit(e, t, sk.power); e.hp = Math.min(e.maxhp, e.hp + d); }
      else hurt(t, K.magDmg(sk.power * rnd(0.9, 1.1), stat(t, 'res')));
    } else enemyHit(e, t);
  }
  let rounds = 0;
  while (live(P).length && live(E).length && rounds < (endless || 60)) {
    rounds++;
    const order = [...live(P).map(m => ({ m, hero: true, s: stat(m, 'agi') * rnd(0.85, 1.15) })), ...live(E).map(m => ({ m, s: m.agi * rnd(0.85, 1.15) }))].sort((a, b) => b.s - a.s);
    for (const o of order) {
      if (o.m.hp <= 0 || !live(P).length || !live(E).length) continue;
      if (o.hero) { if (!endless || only[o.m.id]) { stats[o.m.id].turns++; heroAct(o.m); } } else enemyAct(o.m);
    }
  }
  const max = P.reduce((s, m) => s + maxHp(m), 0), left = P.reduce((s, m) => s + m.hp, 0);
  return { win: !live(E).length, lost: 1 - left / max, rounds, stats };
}

const GEAR = ['espadaFerro', 'cotaMalha', 'cajadoRunico'];
const ALL = ['aldo', 'lyra', 'teo', 'andilla'];
const LINES = [
  ['2 morcegos (nível 1)', ['aldo', 'lyra'], 1, [], ['morcegoCova', 'morcegoCova']],
  ['2 ossadas com Teo (nível 2)', ['aldo', 'lyra', 'teo'], 2, [], ['ossada', 'ossada']],
  ['3 gosmas (nível 3)', ALL, 3, [], ['gosma', 'gosma', 'gosma']],
  ['rato, morcego e gosma (nível 3)', ALL, 3, [], ['rato', 'morcego', 'gosma']],
  ['3 esqueletos (nível 4)', ALL, 4, [], ['esqueleto', 'esqueleto', 'esqueleto']],
  ['Sineiro nível 3 sem equipamento', ALL, 3, [], ['sineiro']],
  ['Sineiro nível 4 equipado', ALL, 4, GEAR, ['sineiro'], 0.10],
  ['Sineiro nível 5 equipado', ALL, 5, GEAR, ['sineiro']],
  ['Sineiro nível 8 equipado', ALL, 8, GEAR, ['sineiro']],
  ['3 esqueletos (nível 12)', ALL, 12, GEAR, ['esqueleto', 'esqueleto', 'esqueleto']],
  ['3 cavaleiros (nível 18)', ALL, 18, GEAR, ['cavaleiro', 'cavaleiro', 'cavaleiro']],
];
// One line per cost tier: the hero uses only that skill whenever it can pay, against attacking only, with the whole
// party at that level and the foes the skill is meant for (they hit back, so Aldo also fills up by taking blows)
const TIERS = [
  ['Aldo', 'golpe', 20, 4, ['loboGeada', 'loboGeada']],
  ['Aldo', 'quebraJunta', 40, 12, ['esqueleto', 'esqueleto']],
  ['Aldo', 'furia', 80, 18, ['cavaleiro', 'cavaleiro', 'cavaleiro']],
  ['Andilla', 'leque', 20, 4, ['gosma', 'gosma']],
  ['Andilla', 'leque', 20, 4, ['gosma', 'gosma', 'gosma']],
  ['Andilla', 'golpeBaixo', 20, 8, ['cavaleiro']],
];
const PACE = 30; // rounds of the steady measure; SHORT is a fight of the usual length, for comparison
const SHORT = 4;

function team(K, ids, lv, gear) {
  return ids.map(id => {
    const m = K.newMember(K.PARTY_DEFS.find(d => d.id === id));
    m.lv = lv;
    for (const g of gear) if (K.EQUIPS[g].who === id) for (const [k, v] of Object.entries(K.EQUIPS[g].bonus)) m.bonus[k] = (m.bonus[k] || 0) + v;
    m.hp = K.maxHp(m); m.mp = K.maxMp(m);
    return m;
  });
}

// n fights of one line: averages, plus damage per turn and turns between techniques of each hero
function many(K, line, n, only, endless = 0, foes = line[4]) {
  const [, ids, lv, gear] = line;
  let w = 0, lost = 0, rounds = 0;
  const hs = {};
  for (let i = 0; i < n; i++) {
    const r = fight(K, team(K, ids, lv, gear), foes, only, endless);
    w += r.win; lost += r.lost; rounds += r.rounds;
    for (const [id, s] of Object.entries(r.stats)) { const h = hs[id] = hs[id] || { dmg: 0, turns: 0, techs: 0 }; h.dmg += s.dmg; h.turns += s.turns; h.techs += s.techs; }
  }
  const per = Object.fromEntries(Object.entries(hs).map(([id, h]) => [id, { dpt: h.dmg / h.turns, gap: h.techs ? h.turns / h.techs : null }]));
  return { win: w / n, lost: lost / n, rounds: rounds / n, per };
}

function run(n) {
  const models = { '1b': load('1b'), '2a': load('2a') };
  return LINES.map(line => {
    const row = { name: line[0], drop: line[5] || 0.03 };
    for (const [k, K] of Object.entries(models)) row[k] = many(K, line, n);
    const K = models['2a'];
    row.plain = many(K, line, n, { aldo: 'none', andilla: 'none' });
    return row;
  });
}

function tiers(n, K = load('2a')) {
  return TIERS.map(([hero, sp, cost, lv, foes]) => {
    const id = hero.toLowerCase(), line = ['', ALL, lv, lv >= 4 ? GEAR : [], foes];
    const pace = rounds => many(K, line, n, { [id]: sp }, rounds, foes).per[id].dpt / many(K, line, n, { [id]: 'none' }, rounds, foes).per[id].dpt;
    const used = many(K, line, n, { [id]: sp }, PACE, foes).per[id];
    return { hero, name: K.SPELLS[sp].name, cost, lv, foes: `${foes.length} ${K.ENEMIES[foes[0]].name.toLowerCase()}`, ratio: pace(PACE), short: pace(SHORT), gap: used.gap };
  });
}

if (require.main === module) {
  const n = +process.argv[2] || 20000, pct = v => (v * 100).toFixed(1) + '%', f1 = v => v == null ? '-' : v.toFixed(1), gap = v => v == null ? '-' : v > 20 ? 'raro' : v.toFixed(1);
  const rows = run(n);
  console.log(`${n} lutas por linha · vitória / PV perdido / rodadas\n`);
  console.log('| Luta | Fase 1b | Fase 2a | Dentro do critério |');
  console.log('| --- | --- | --- | --- |');
  for (const r of rows) {
    const a = r['1b'], b = r['2a'];
    const ok = a.win - b.win <= r.drop && b.win - a.win <= 0.03 && Math.abs(a.lost - b.lost) <= 0.05;
    console.log(`| ${r.name} | ${pct(a.win)} / ${pct(a.lost)} / ${a.rounds.toFixed(1)} | ${pct(b.win)} / ${pct(b.lost)} / ${b.rounds.toFixed(1)} | ${ok ? 'sim' : 'NÃO'} |`);
  }
  console.log('\nDano por turno na Fase 2a, com técnicas / só atacando, e turnos entre técnicas\n');
  console.log('| Luta | Aldo | Andilla |');
  console.log('| --- | --- | --- |');
  for (const r of rows) {
    const cell = id => r['2a'].per[id] ? `${f1(r['2a'].per[id].dpt)} / ${f1(r.plain.per[id].dpt)} · ${gap(r['2a'].per[id].gap)}` : '-';
    console.log(`| ${r.name} | ${cell('aldo')} | ${cell('andilla')} |`);
  }
  console.log(`\nCada faixa de custo: dano por turno usando só essa técnica sempre que pode, dividido pelo de só atacar (alvo: 1,15x a 1,45x).`);
  console.log(`Ritmo: ${PACE} rodadas contra alvos que não caem; luta curta: as primeiras ${SHORT} rodadas, para comparar.\n`);
  console.log('| Herói | Técnica | Custo | Nível | Alvos | Ritmo | Luta curta | Turnos entre usos |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const t of tiers(Math.max(200, n / 20))) console.log(`| ${t.hero} | ${t.name} | ${t.cost} | ${t.lv} | ${t.foes} | ${t.ratio.toFixed(2)}x${t.ratio >= 1.15 && t.ratio <= 1.45 ? '' : ' (fora)'} | ${t.short.toFixed(2)}x | ${gap(t.gap)} |`);
  let xp = 0; for (let lv = 1; lv < 30; lv++) xp += Math.floor(12 * Math.pow(lv, 1.9));
  console.log(`\nXP total do nível 1 ao 30: ${xp}`);
}

module.exports = { load, fight, run, tiers, LINES, TIERS };
