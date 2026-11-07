// ===== Combat simulator: the real formulas of the game, simple fixed hero actions =====
// npm run sim [-- fights]  ·  compares the linear Defesa/Resistência of Phase 1 (percent, capped at 75) with the
// diminishing curve of Phase 1b (src/party.js, cutPct). Hero and enemy numbers come from src/data.js as they are.
//
// Long run (curve, Aldo with no gear): his Defesa cuts about 44% at level 10, 54% at level 20 and 60% at level 30,
// and it never stops growing. With the linear model he hit the 75% cap at level 12 and stopped there.
//
// Hero actions, no items: Aldo uses Quebra-Junta against the undead, Fúria against 3 or more and Golpe Forte otherwise;
// Lyra Gelo against 2 or more, Raio against a target with more than 60 PV and Fogo otherwise; Teo heals whoever is under
// half PV and uses Luz Sagrada against the undead; Andilla Leque de Facas against 2 or more and Golpe Baixo otherwise.
// Without PM, or before learning the skill, a hero attacks. Enemies act as in src/battle.js (skills, the boss pattern).
const fs = require('node:fs');
const vm = require('node:vm');
const SRC = `${__dirname}/../src/`;

function load(model) {
  const G = { party: [], inv: {}, seen: {} };
  const ctx = { console, G, UI: new Proxy({}, { get: () => () => {} }), Sfx: new Proxy({}, { get: () => () => {} }) };
  vm.createContext(ctx);
  for (const f of ['palette', 'data', 'uirules', 'party']) {
    let code = fs.readFileSync(SRC + f + '.js', 'utf8');
    if (f === 'party' && model === 'linear') code = code.replace(/const cutPct = .*\n/, 'const cutPct = points => Math.min(75, Math.max(0, points || 0));\n');
    vm.runInContext(code, ctx, { filename: f });
  }
  return vm.runInContext('({ G, ENEMIES, SPELLS, EQUIPS, PARTY_DEFS, HIT, stat, maxHp, maxMp, knownSpells, physDmg, magDmg, rollHit, critChance, newMember, pdef, rnd })', ctx);
}

function fight(K, heroes, foes) {
  const { stat, maxHp, maxMp, SPELLS, ENEMIES, HIT, rnd } = K;
  const P = heroes, E = foes.map(id => ({ ...ENEMIES[id], id, maxhp: ENEMIES[id].hp }));
  const live = a => a.filter(x => x.hp > 0);
  const knows = (m, s) => K.knownSpells(m).includes(s) && m.mp >= SPELLS[s].mp;
  const weakest = () => live(E).sort((a, b) => a.hp - b.hp)[0];
  const hurt = (m, d) => { m.hp = Math.max(0, m.hp - d); return d; };
  function cast(m, s, t) {
    const sp = SPELLS[s]; m.mp -= sp.mp;
    if (sp.kind === 'heal') { t.hp = Math.min(maxHp(t), t.hp + Math.round((stat(m, 'mag') * sp.power + sp.base) * rnd(0.9, 1.1))); return; }
    for (const e of sp.target === 'allEnemies' ? live(E) : [t]) {
      let d;
      if (sp.kind === 'phys') d = Math.round(K.physDmg(stat(m, 'atk'), sp.pierce ? 0 : e.def, sp.power) * (sp.bone && e.undead ? sp.bone : 1));
      else { d = K.magDmg((stat(m, 'mag') * sp.power + sp.base) * rnd(0.9, 1.1), e.res); if (sp.kind === 'holy' && e.undead) d *= 2; }
      e.hp = Math.max(0, e.hp - d);
    }
  }
  function attack(m, t) {
    const r = K.rollHit(K.critChance(m.id), t.agi);
    if (r === 'miss' || r === 'dodge') return;
    t.hp = Math.max(0, t.hp - K.physDmg(stat(m, 'atk'), t.def, r === 'crit' ? HIT.critMul : 1));
  }
  function heroAct(m) {
    const en = live(E), t = weakest(), many = en.length;
    if (m.id === 'aldo') {
      if (t.undead && knows(m, 'quebraJunta')) return cast(m, 'quebraJunta', t);
      if (many >= 3 && knows(m, 'furia')) return cast(m, 'furia');
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
      if (knows(m, 'golpeBaixo')) return cast(m, 'golpeBaixo', t);
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
  while (live(P).length && live(E).length && rounds < 60) {
    rounds++;
    const order = [...live(P).map(m => ({ m, hero: true, s: stat(m, 'agi') * rnd(0.85, 1.15) })), ...live(E).map(m => ({ m, s: m.agi * rnd(0.85, 1.15) }))].sort((a, b) => b.s - a.s);
    for (const o of order) {
      if (o.m.hp <= 0 || !live(P).length || !live(E).length) continue;
      if (o.hero) heroAct(o.m); else enemyAct(o.m);
    }
  }
  const max = P.reduce((s, m) => s + maxHp(m), 0), left = P.reduce((s, m) => s + m.hp, 0);
  return { win: !live(E).length, lost: 1 - left / max, rounds };
}

const GEAR = ['espadaFerro', 'cotaMalha', 'cajadoRunico'];
const LINES = [
  ['2 morcegos (nível 1)', ['aldo', 'lyra'], 1, [], ['morcegoCova', 'morcegoCova']],
  ['2 ossadas com Teo (nível 2)', ['aldo', 'lyra', 'teo'], 2, [], ['ossada', 'ossada']],
  ['3 gosmas (nível 3)', ['aldo', 'lyra', 'teo', 'andilla'], 3, [], ['gosma', 'gosma', 'gosma']],
  ['rato, morcego e gosma (nível 3)', ['aldo', 'lyra', 'teo', 'andilla'], 3, [], ['rato', 'morcego', 'gosma']],
  ['3 esqueletos (nível 4)', ['aldo', 'lyra', 'teo', 'andilla'], 4, [], ['esqueleto', 'esqueleto', 'esqueleto']],
  ['Sineiro nível 3 sem equipamento', ['aldo', 'lyra', 'teo', 'andilla'], 3, [], ['sineiro']],
  ['Sineiro nível 4 equipado', ['aldo', 'lyra', 'teo', 'andilla'], 4, GEAR, ['sineiro']],
  ['Sineiro nível 5 equipado', ['aldo', 'lyra', 'teo', 'andilla'], 5, GEAR, ['sineiro']],
  ['Sineiro nível 8 equipado', ['aldo', 'lyra', 'teo', 'andilla'], 8, GEAR, ['sineiro']],
];

function team(K, ids, lv, gear) {
  return ids.map(id => {
    const m = K.newMember(K.PARTY_DEFS.find(d => d.id === id));
    m.lv = lv;
    for (const g of gear) if (K.EQUIPS[g].who === id) for (const [k, v] of Object.entries(K.EQUIPS[g].bonus)) m.bonus[k] = (m.bonus[k] || 0) + v;
    m.hp = K.maxHp(m); m.mp = K.maxMp(m);
    return m;
  });
}

function run(n) {
  const models = { linear: load('linear'), curva: load('curve') }, rows = [];
  for (const [name, ids, lv, gear, foes] of LINES) {
    const row = { name };
    for (const [k, K] of Object.entries(models)) {
      let w = 0, lost = 0, rounds = 0;
      for (let i = 0; i < n; i++) { const r = fight(K, team(K, ids, lv, gear), foes); w += r.win; lost += r.lost; rounds += r.rounds; }
      row[k] = { win: w / n, lost: lost / n, rounds: rounds / n };
    }
    rows.push(row);
  }
  return rows;
}

if (require.main === module) {
  const n = +process.argv[2] || 20000, pct = v => (v * 100).toFixed(1) + '%';
  console.log(`${n} lutas por linha · vitória / PV perdido / rodadas\n`);
  console.log('| Luta | Linear (Fase 1) | Curva (Fase 1b) | Dentro do critério |');
  console.log('| --- | --- | --- | --- |');
  for (const r of run(n)) {
    const a = r.linear, b = r.curva;
    const ok = Math.abs(a.win - b.win) <= 0.03 && Math.abs(a.lost - b.lost) <= 0.05 && Math.abs(a.rounds - b.rounds) <= a.rounds * 0.1;
    console.log(`| ${r.name} | ${pct(a.win)} / ${pct(a.lost)} / ${a.rounds.toFixed(1)} | ${pct(b.win)} / ${pct(b.lost)} / ${b.rounds.toFixed(1)} | ${ok ? 'sim' : 'NÃO'} |`);
  }
  const K = load('curve'), aldo = lv => { const m = K.newMember(K.PARTY_DEFS[0]); m.lv = lv; return Math.round(80 * K.stat(m, 'def') / (K.stat(m, 'def') + 55)); };
  console.log(`\nAldo sem equipamento, redução da Defesa: nível 10 ${aldo(10)}%, nível 20 ${aldo(20)}%, nível 30 ${aldo(30)}%`);
}

module.exports = { load, fight, run, LINES };
