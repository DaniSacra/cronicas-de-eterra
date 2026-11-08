// ===== Grupo: atributos, itens e magias de cura =====

const pdef = m => PARTY_DEFS.find(d => d.id === m.id);
function stat(m, k) { const d = pdef(m); return Math.floor(d.base[k] + d.grow[k] * (m.lv - 1)) + (m.bonus[k] || 0); }
const maxHp = m => stat(m, 'hp');
const maxMp = m => stat(m, 'mp');
const knownSpells = m => pdef(m).spells.filter(([lv]) => m.lv >= lv).map(s => s[1]);
// The resource a hero spends (combat design, Phase 2a): Energia for the combat heroes, PM for the magic ones.
// Nothing else reads sp.mp or m.mp for a cost; only the PM-only things do (Éter, the mage's PM bar).
const usesEnergy = m => !!pdef(m).energy;
const resourceOf = m => usesEnergy(m)
  ? { kind: 'energy', label: 'Energia', cur: m.en || 0, max: ENERGY.max }
  : { kind: 'mp', label: 'PM', cur: m.mp, max: maxMp(m) };
const spellCost = sp => sp.en ?? sp.mp;
const costText = sp => sp.en != null ? `${sp.en} de Energia` : `${sp.mp} PM`;
const costHint = sp => sp.en != null ? `${sp.en} Energia` : `${sp.mp}PM`;
const canPay = (m, sp) => resourceOf(m).cur >= spellCost(sp);
function pay(m, sp) { if (usesEnergy(m)) m.en = (m.en || 0) - spellCost(sp); else m.mp -= spellCost(sp); }
// Energia gained (or lost, n < 0), kept between 0 and ENERGY.max; returns what really changed. PM heroes get none.
function gainEnergy(m, n) {
  if (!usesEnergy(m)) return 0;
  const before = m.en || 0;
  m.en = Math.max(0, Math.min(ENERGY.max, before + n));
  return m.en - before;
}
// Energia a hero's attack earns (0 on a miss or a dodge; the crit bonus is per hero)
const attackEnergy = (heroId, roll) => roll === 'miss' || roll === 'dodge' ? 0 : ENERGY.attack + (roll === 'crit' ? ENERGY.crit[heroId] || 0 : 0);
// Rest, fountain, Elixir, a new member: PV and PM full; Energia never carries over
function fullRestore(m) { m.hp = maxHp(m); m.mp = maxMp(m); m.en = 0; }
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
// Damage (combat design, Phases 1 and 1b): Defesa cuts physical damage and Resistência cuts magic damage. Both are
// points; the share they cut follows a diminishing curve, GUARD_MAX x points / (points + GUARD_HALF): every point is
// worth a little less than the one before, the cut never reaches GUARD_MAX, and a hero keeps improving up to level 30.
// v is the random spread, passed in by the tests.
const GUARD_MAX = 80, GUARD_HALF = 55;
const cutPct = points => { const p = Math.max(0, points || 0); return GUARD_MAX * p / (p + GUARD_HALF); };
const guardCut = points => 1 - cutPct(points) / 100;
// The Heroes screen shows the points and, beside them, the share of damage they really cut
const guardText = points => `${Math.round(cutPct(points))}%`;
const physDmg = (atk, def, power = 1, v = rnd(0.88, 1.12)) => Math.max(1, Math.round(atk * power * v * guardCut(def)));
const magDmg = (raw, res) => Math.max(1, Math.round(raw * guardCut(res)));
// Saves before v3 kept the old Defesa scale: the equipment bonus is multiplied once (x2.5, like the heroes' Defesa)
const migrateBonus = (bonus, v) => (v || 0) >= 3 || !bonus.def ? bonus : { ...bonus, def: Math.round(bonus.def * 2.5) };
// A hero from a save: old bonus scale fixed, Energia always 0 (it is never saved) and no PM left on the combat heroes
// (saves from before Phase 2a kept Aldo and Andilla with PM)
const saveMember = ({ id, lv, xp, hp, mp, bonus }) => ({ id, lv, xp, hp, mp, bonus });
const loadMember = (m, v) => ({ ...m, bonus: migrateBonus(m.bonus || {}, v), mp: usesEnergy(m) ? 0 : m.mp, en: 0 });
const wait = ms => new Promise(r => setTimeout(r, ms));
const aliveParty = () => G.party.filter(m => m.hp > 0);

const heroName = id => PARTY_DEFS.find(d => d.id === id).name;
const inParty = id => G.party.some(m => m.id === id);
const HERO_IDS = PARTY_DEFS.map(d => d.id);

// A party talk plays once per save (G.seen['talk:'+id]); heroes not in the party are skipped.
// lines: [[heroId | speaker | null, text or () => text, mood?], ...] (mood: alegre | preocupado | bravo)
async function partyTalk(id, lines) {
  if (!takeTalk(G.seen, id)) return;
  for (const [who, t, mood] of talkLines(lines, HERO_IDS, inParty)) {
    const text = typeof t === 'function' ? t() : t;
    if (!text) continue; // a line may depend on the save (e.g. no answer stored)
    const name = HERO_IDS.includes(who) ? heroName(who) : who;
    await UI.say(name ? `${name}${mood ? '~' + mood : ''}:\n${text}` : text);
  }
}

// A new piece of gear (chest or forge): the hero wears it when it beats what they have, and the bonus changes by delta
function wearGear(id, delta) {
  const eq = EQUIPS[id], m = G.party.find(p => p.id === eq.who), nm = pdef(m).name;
  if (!Object.keys(delta).length) return `Encontraram: ${eq.name}!\n${nm} já usa algo melhor e guarda na bolsa.`;
  for (const [k, v] of Object.entries(delta)) m.bonus[k] = (m.bonus[k] || 0) + v;
  G.equip = G.equip || {}; G.equip[eq.who] = { ...G.equip[eq.who], [eq.slot]: id }; // the new piece is what the hero wears now
  UI.updateParty(); UI.cardGlow(m);
  return `Encontraram: ${eq.name}!\n${nm} equipa (${bonusText(eq.bonus, STAT_NAMES)}).`;
}

// Novo companheiro: chega no nível e XP do líder, com vida e magia cheias. A mensagem fica com quem chama.
function recruit(id, actor = null) {
  const lead = G.party[0], m = newMember(PARTY_DEFS.find(d => d.id === id));
  if (lead) { m.lv = lead.lv; m.xp = lead.xp; fullRestore(m); }
  G.party.push(m); UI.buildParty();
  if (G.mode === 'town' && TOWN.p) {
    const a = actor || TOWN.p;
    TOWN.followers.push(newActor(a.x, a.y, a.dir));
    if (actor) TOWN.npcs = TOWN.npcs.filter(n => n !== actor);
  }
  return m;
}

function newMember(d) { const m = { id: d.id, lv: 1, xp: 0, hp: 0, mp: 0, bonus: {} }; fullRestore(m); return m; }

function healHp(m, n) {
  const before = m.hp; m.hp = Math.min(maxHp(m), m.hp + n);
  const got = m.hp - before;
  UI.cardFloat(m, '+' + got, '#7dff9a'); UI.cardGlow(m);
  return got;
}
function healMp(m, n) {
  const before = m.mp; m.mp = Math.min(maxMp(m), m.mp + n);
  const got = m.mp - before;
  UI.cardFloat(m, '+' + got + 'PM', '#7dc8ff'); UI.cardGlow(m);
  return got;
}
function revive(m, frac) { m.hp = Math.max(1, Math.floor(maxHp(m) * frac)); UI.cardFloat(m, 'VIVO!', '#ffe070'); UI.cardGlow(m); }

// An item that would do nothing stays in the bag, with the reason (null when it works)
function itemUseless(id, target) {
  const name = target && target.id && pdef(target).name;
  if ((id === 'pocao' || id === 'eter' || id === 'pao') && target.hp <= 0) return `${name} caiu. ${id === 'pocao' ? 'A poção' : id === 'pao' ? 'O pão' : 'O éter'} não tem efeito.`;
  if ((id === 'pocao' || id === 'pao') && target.hp >= maxHp(target)) return `${name} já está com os PV cheios.`;
  if (id === 'eter' && usesEnergy(target)) return `${name} não usa PM. O éter não tem efeito.`;
  if (id === 'eter' && target.mp >= maxMp(target)) return `${name} já está com os PM cheios.`;
  if (id === 'pena' && target.hp > 0) return `${name} não precisa disso.`;
  if (id === 'elixir' && G.party.every(m => m.hp >= maxHp(m) && m.mp >= maxMp(m))) return 'O grupo já está inteiro. O Elixir fica guardado.';
  return null;
}

// Retorna a mensagem do efeito
function applyItem(id, target) {
  if (!G.inv[id]) return 'Não há mais ' + ITEMS[id].name + '!';
  const useless = itemUseless(id, target);
  if (useless) return useless;
  G.inv[id]--;
  let msg = '';
  switch (id) {
    case 'pocao': msg = `${pdef(target).name} recupera ${healHp(target, ITEMS.pocao.fx.hp)} PV.`; Sfx.heal(); break;
    case 'pao': msg = `${pdef(target).name} come o pão da Berta e recupera ${healHp(target, ITEMS.pao.fx.hp)} PV.`; Sfx.heal(); break;
    case 'eter': msg = `${pdef(target).name} recupera ${healMp(target, ITEMS.eter.fx.mp)} PM.`; Sfx.heal(); break;
    case 'pena': revive(target, ITEMS.pena.fx.revive); msg = `${pdef(target).name} voltou à vida!`; Sfx.holy(); break;
    case 'elixir':
      for (const m of G.party) { m.hp = maxHp(m); m.mp = maxMp(m); UI.cardGlow(m); } // PM only fill for the magic heroes; Energia stays as it is
      msg = 'O Elixir restaura todo o grupo!'; Sfx.holy(); break;
  }
  UI.updateParty();
  return msg;
}

// Magias de suporte (usadas em batalha e fora dela); out.healed gets what a single heal really cured (for the Elos)
function castSupport(caster, spellId, target, out = {}) {
  const sp = SPELLS[spellId];
  const c = pdef(caster).name;
  if (sp.kind === 'heal') {
    const amount = () => Math.round((stat(caster, 'mag') * sp.power + sp.base) * rnd(0.9, 1.1));
    Sfx.heal();
    if (sp.target === 'allAllies') {
      aliveParty().forEach(m => healHp(m, amount()));
      UI.updateParty(); return 'O grupo é envolvido por uma luz cálida.';
    }
    if (target.hp <= 0) { UI.updateParty(); return `${pdef(target).name} está caído...`; }
    const got = out.healed = healHp(target, amount()); UI.updateParty();
    return `${pdef(target).name} recupera ${got} PV.`;
  }
  if (sp.kind === 'revive') {
    if (target.hp > 0) return `${pdef(target).name} já está de pé.`;
    revive(target, 0.5); Sfx.holy(); UI.updateParty();
    return `${pdef(target).name} voltou à vida!`;
  }
  return `${c} hesita.`;
}

// The target cards of the Bolsa and the Livro: what an item or a field skill would do to each hero
function spellFx(sp, caster) {
  if (sp.kind === 'revive') return { revive: 0.5 };
  const hp = Math.round(stat(caster, 'mag') * sp.power + sp.base);
  return sp.target === 'allAllies' ? { all: true, hp } : { hp };
}
const fxStats = m => ({ hp: m.hp, maxHp: maxHp(m), mp: m.mp, maxMp: maxMp(m), mpUser: !usesEnergy(m) });
const previewFor = (fx, m) => targetPreview(fx, fxStats(m));
// An effect on the whole party is worth it when someone gains: the Cura Total heals who stands; the Elixir fills
// PV and PM of everyone, the fallen too
const groupNeeds = fx => G.party.some(m => (fx.hp ? previewFor({ hp: 1 }, m).ok : m.hp < maxHp(m) || m.mp < maxMp(m)));

async function pickAlly(kind, title, o = {}) {
  const opts = G.party.map(m => ({
    label: pdef(m).name, hint: `${m.hp}/${maxHp(m)}`, value: m,
    disabled: kind === 'deadAlly' ? m.hp > 0 : m.hp <= 0,
  }));
  if (!opts.some(o => !o.disabled)) {
    await UI.say(kind === 'deadAlly' ? 'Ninguém precisa ser revivido.' : 'Ninguém pode receber isso.');
    return null;
  }
  if (G.party.length === 1 && !opts[0].disabled) return G.party[0];
  return UI.choose(opts, { title, cancel: true, cols: G.party.length > 3 ? 2 : 3, party: true, ...o });
}

// What the red dots of the menu compare: the skills each hero knows and the notes the Diário shows (G.seen keeps
// what was already opened; an old save starts with everything it has as seen)
const bookKeys = () => G.party.flatMap(m => knownSpells(m).map(s => `${m.id}:${s}`));
const diaryKeys = () => JOURNAL.notes.flatMap((n, i) => (n.show() ? [String(i)] : []));
const READ = { book: ['bookRead', bookKeys], diary: ['diaryRead', diaryKeys] };
function menuDots() {
  for (const [k, keys] of Object.values(READ)) if (!G.seen[k]) G.seen[k] = keys();
  return Object.fromEntries(Object.entries(READ).map(([v, [k, keys]]) => [v, unseen(keys(), G.seen[k]).length > 0]));
}
const markRead = v => { const [k, keys] = READ[v]; G.seen[k] = [...new Set([...(G.seen[k] || []), ...keys()])]; };

function itemOptions() {
  return Object.keys(ITEMS).filter(k => G.inv[k] > 0).map(k => ({ label: `${ITEMS[k].name} x${G.inv[k]}`, hint: ITEMS[k].desc, value: k }));
}

// XP from a fight; at MAX_LEVEL nothing more is gained
function gainXp(m, xp) {
  if (m.lv >= MAX_LEVEL) { m.xp = 0; return []; }
  m.xp += xp;
  return levelUp(m);
}
// Applies the XP the member already has: one entry per level gained, { name, lv, learned: [spell names] }
function levelUp(m) {
  const ups = [];
  while (m.lv < MAX_LEVEL && m.xp >= xpNext(m.lv)) {
    m.xp -= xpNext(m.lv);
    const oh = maxHp(m), om = maxMp(m);
    m.lv++;
    m.hp += maxHp(m) - oh; m.mp += maxMp(m) - om;
    if (m.lv >= MAX_LEVEL) m.xp = 0;
    ups.push({ name: pdef(m).name, lv: m.lv, learned: pdef(m).spells.filter(([lv]) => lv === m.lv).map(([, id]) => SPELLS[id].name) });
  }
  return ups;
}
// Everyone who reached the same level shares one box; each new spell gets its own box
function levelUpLines(ups) {
  const byLv = new Map();
  for (const u of ups) byLv.set(u.lv, [...(byLv.get(u.lv) || []), u.name]);
  const and = names => { const ns = names.map((n, i) => (i ? midName(n) : n)); return ns.length > 1 ? ns.slice(0, -1).join(', ') + ' e ' + ns.at(-1) : ns[0]; };
  return [
    ...[...byLv].map(([lv, ns]) => `${and(ns)} ${ns.length > 1 ? 'subiram' : 'subiu'} para o nível ${lv}!`),
    ...ups.filter(u => u.learned.length).map(u => `${u.name} aprendeu: ${u.learned.join(', ')}!`),
  ];
}
