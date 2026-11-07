// ===== Tactics (macros): the party's commands from one round, replayed with a single command =====
// Pure rules only (Node tests in test/macro.test.js); battle.js wires them into the turn loop.
// A macro stores the rule, never the object: { [heroId]: { type, spell?, item?, enemy? } } (enemy = index in the fight)

const MACRO_SLOTS = 2;
const macroName = slot => `Tática ${slot + 1}`;
const MACRO_TIP = 'Tática guarda os comandos da rodada anterior. Escolha Tática e depois Gravar tática. Nas próximas rodadas, Tática 1 repete tudo. Atalhos: 1 e 2.';

// Saves without macros (or with a broken value) get two empty slots
function normalizeMacros(v) {
  return Array.from({ length: MACRO_SLOTS }, (_, i) => (Array.isArray(v) && v[i] && typeof v[i] === 'object') ? v[i] : null);
}

// What one chosen command becomes in the round record ("Fugir" is kept as an attack)
function macroEntry(cmd) {
  if (cmd.type === 'run') return { type: 'attack' };
  if (cmd.type === 'defend') return { type: 'defend' };
  const e = { type: cmd.type };
  if (cmd.spell) e.spell = cmd.spell;
  if (cmd.item) e.item = cmd.item;
  if (cmd.target && typeof cmd.target === 'object' && 'i' in cmd.target) e.enemy = cmd.target.i;
  return e;
}

// End of a round: a complete round replaces the last one (a hero who fell never acted, so he is not in it);
// a round cut short by the end of the fight only updates the heroes who acted
function closeRound(last, round, complete) {
  if (!Object.keys(round).length) return last;
  return complete ? { ...round } : { ...(last || {}), ...round };
}

// ---------- Target rules ----------
const aliveOf = list => list.filter(x => x.hp > 0);
function enemyRule(entry, enemies) {
  const alive = aliveOf(enemies);
  return alive.find(e => e.i === entry.enemy) || alive.reduce((a, e) => (!a || e.x < a.x ? e : a), null);
}
const lowest = (party, cur, max) => aliveOf(party).filter(m => max(m) > 0)
  .reduce((a, m) => (!a || cur(m) / max(m) < cur(a) / max(a) ? m : a), null);
const firstFallen = party => party.find(m => m.hp <= 0) || null;

// ctx: { actor, name, party, enemies, inv, spells, items, maxHp, maxMp, useless(itemId, target) -> message|null,
//        resourceOf(m) -> { kind, label, cur }, canPay(m, spell) }
// Returns { cmd, warn }: the command to run now, and what the game says when the rule had to change it
function resolveMacro(entry, ctx) {
  const { actor, name, party, enemies } = ctx;
  const defend = warn => ({ cmd: { type: 'defend' }, warn });
  const allyTarget = (kind, mp) => kind === 'enemy' ? enemyRule(entry, enemies)
    : kind === 'allEnemies' || kind === 'allAllies' ? 'all'
    : kind === 'deadAlly' ? firstFallen(party)
    : mp ? lowest(party.filter(m => ctx.resourceOf(m).kind === 'mp'), m => m.mp, ctx.maxMp) // Éter: only the heroes with PM
    : lowest(party, m => m.hp, ctx.maxHp);
  if (entry.type === 'defend') return defend(null);
  if (entry.type === 'attack') return { cmd: { type: 'attack', target: enemyRule(entry, enemies) }, warn: null };
  if (entry.type === 'spell') {
    const sp = ctx.spells[entry.spell];
    if (!sp || !ctx.canPay(actor, sp)) return { cmd: { type: 'attack', target: enemyRule(entry, enemies) }, warn: sp ? `${ctx.resourceOf(actor).label} insuficiente. ${name} ataca.` : `${name} ainda não aprendeu isso. ${name} ataca.` };
    const target = allyTarget(sp.target, false);
    if (!target) return defend(sp.target === 'deadAlly' ? `Ninguém caído. ${name} se defende.` : null);
    return { cmd: { type: 'spell', spell: entry.spell, target }, warn: null };
  }
  if (entry.type === 'item') {
    const it = ctx.items[entry.item];
    if (!it || !ctx.inv[entry.item]) return defend(`Sem ${it ? it.name : 'esse item'} na bolsa. ${name} se defende.`);
    const target = allyTarget(it.target, entry.item === 'eter');
    if (!target) return defend(it.target === 'deadAlly' ? `Ninguém caído. ${name} se defende.` : null);
    const useless = ctx.useless(entry.item, target);
    if (useless) return defend(`${useless} ${name} se defende.`);
    return { cmd: { type: 'item', item: entry.item, target }, warn: null };
  }
  return defend(null);
}

// ---------- Presentation ----------
// One icon per command: sword, fire, heart (cure or revive), star (other magic), the item itself, shield
function entryIcon(entry, spells) {
  if (entry.type === 'attack') return 'atk';
  if (entry.type === 'defend') return 'def';
  if (entry.type === 'item') return entry.item;
  const sp = spells[entry.spell] || {};
  return sp.kind === 'heal' || sp.kind === 'revive' ? 'cura' : sp.fx === 'fire' ? 'fogo' : sp.fx === 'slash' ? 'atk' : 'spell';
}
// Icons in party order; heroes the tactic does not know are left out
const macroIcons = (macro, partyIds, spells) => macro ? partyIds.filter(id => macro[id]).map(id => entryIcon(macro[id], spells)) : [];

// The tip shows once, from the 3rd fight in the crypt on, at the start of round 2 (there is a round to record),
// and never for someone who already recorded or used a tactic
const macroTipDue = (seen, round, boss) => !boss && round === 2 && (seen.lutasCripta || 0) >= 3 && !seen.macro && !seen.dicaTatica;

if (typeof module !== 'undefined') module.exports = { MACRO_SLOTS, MACRO_TIP, macroName, normalizeMacros, macroEntry, closeRound, enemyRule, resolveMacro, entryIcon, macroIcons, macroTipDue };
