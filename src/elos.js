// ===== Elos: two heroes, the right two skills, the same round =====
// Pure rules (no DOM, no G): the battle feeds every resolved hero action into the round's record; an action that
// matches a prepared one of the partner, on a common target, completes an Elo. Everything specific to an Elo comes
// from the ELOS table (src/data.js): the heroes, the skills each one may use, the kind of effect and its factors.

// Elos exist once the Sineiro is down (and already in the fight with him). Old saves past the prologue count too.
const elosOpen = (g, bossFight = false) => !!(bossFight || (g && (g.bossDead || (g.chapter || 0) >= 1)));

// A fresh record at the start of every round
const eloRound = () => ({ preps: [], fired: {} });

// The Elo (id) where this hero's skill is a part, if any
const eloParts = (ELOS, heroId, spellId) => Object.keys(ELOS).filter(id => (ELOS[id].parts[heroId] || []).includes(spellId));

// Targets of an action: enemy keys for an attack (an area skill lists every enemy it hit), null for a heal (it
// has no enemy, so it fits any target)
const commonTargets = (a, b) => (a.targets == null ? b.targets : b.targets == null ? a.targets : a.targets.filter(t => b.targets.includes(t)));

// act: { actorId, spellId, targets: [enemyKey] | null, dealt: { enemyKey: damage }, healed, healTarget }
// alive(enemyKey) tells which enemies still stand. Returns { id, first, second, targets } or null, and keeps act as
// this hero's preparation (a new one replaces the old)
function linkElo(reg, ELOS, act, alive = () => true) {
  let done = null;
  for (const id of eloParts(ELOS, act.actorId, act.spellId)) {
    if (reg.fired[id] || done) continue;
    const partner = ELOS[id].heroes.find(h => h !== act.actorId);
    const prep = reg.preps.find(p => p.actorId === partner && (ELOS[id].parts[partner] || []).includes(p.spellId));
    if (!prep) continue;
    const targets = commonTargets(prep, act);
    const live = targets == null ? null : targets.filter(alive);
    if (live && !live.length) continue;
    reg.fired[id] = true;
    done = { id, first: prep, second: act, targets: live };
  }
  reg.preps = reg.preps.filter(p => p.actorId !== act.actorId && !(done && p === done.first));
  if (!done && eloParts(ELOS, act.actorId, act.spellId).length) reg.preps.push(act);
  return done;
}

// A hero who falls loses what he prepared
function dropElo(reg, heroId) { reg.preps = reg.preps.filter(p => p.actorId !== heroId); }

// Who has prepared a part of an Elo the party already knows (the card shows it); unknown Elos give no sign
const eloReady = (reg, ELOS, known = {}) => reg.preps.filter(p => eloParts(ELOS, p.actorId, p.spellId).some(id => known[id] && !reg.fired[id])).map(p => p.actorId);

// What a completed Elo adds:
// - strike: one extra blow on the common target, a share of the damage both heroes did to it, armor ignored
// - blessing: an extra blow on every enemy the area skill hit (a share of that damage) and, on every standing ally
//   but the one already healed, a share of the heal
// Returns { hits: [{ target, dmg }], heals: { amount, except } | null }
function eloBonus(elo, done, alive = () => true) {
  const sum = (act, t) => (act.dealt && act.dealt[t]) || 0;
  if (elo.kind === 'strike') {
    const t = (done.targets || []).find(alive);
    if (t == null) return { hits: [], heals: null };
    return { hits: [{ target: t, dmg: Math.max(1, Math.round(elo.dmg * (sum(done.first, t) + sum(done.second, t)))) }], heals: null };
  }
  const area = [done.first, done.second].find(a => a.targets != null), heal = [done.first, done.second].find(a => a.healTarget != null);
  const hits = Object.keys(area.dealt).filter(alive).map(t => ({ target: t, dmg: Math.max(1, Math.round(elo.dmg * area.dealt[t])) }));
  return { hits, heals: heal && heal.healed > 0 ? { amount: Math.round(elo.heal * heal.healed), except: heal.healTarget } : null };
}

// The discovery scene with the heroes' current names: [speaker | null, text]; {a} and {b} are ELOS heroes 0 and 1
const eloScene = (elo, nameOf) => [
  ...elo.scene.map(([who, t]) => [who, t.replace(/\{a\}/g, nameOf(elo.heroes[0])).replace(/\{b\}/g, nameOf(elo.heroes[1]))]),
  [null, `Elo descoberto: ${elo.name}.`],
];

// The Livro de Elos: one card per Elo, known or still a riddle
const eloBook = (ELOS, known = {}) => Object.entries(ELOS).map(([id, e]) => ({ id, known: !!known[id], name: e.name, heroes: e.heroes, asks: e.asks, does: e.does, hint: e.hint }));
const eloBookOpen = (g) => elosOpen(g) || Object.values((g && g.seen && g.seen.elos) || {}).some(Boolean);

if (typeof module !== 'undefined') module.exports = { elosOpen, eloRound, eloParts, linkElo, dropElo, eloReady, eloBonus, eloScene, eloBook, eloBookOpen };
