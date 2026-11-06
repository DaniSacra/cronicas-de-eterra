// ===== Grupo: atributos, itens e magias de cura =====

const pdef = m => PARTY_DEFS.find(d => d.id === m.id);
function stat(m, k) { const d = pdef(m); return Math.floor(d.base[k] + d.grow[k] * (m.lv - 1)) + (m.bonus[k] || 0); }
const maxHp = m => stat(m, 'hp');
const maxMp = m => stat(m, 'mp');
const knownSpells = m => pdef(m).spells.filter(([lv]) => m.lv >= lv).map(s => s[1]);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
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

// Novo companheiro: chega no nível e XP do líder, com vida e magia cheias. A mensagem fica com quem chama.
function recruit(id, actor = null) {
  const lead = G.party[0], m = newMember(PARTY_DEFS.find(d => d.id === id));
  if (lead) { m.lv = lead.lv; m.xp = lead.xp; m.hp = maxHp(m); m.mp = maxMp(m); }
  G.party.push(m); UI.buildParty();
  if (G.mode === 'town' && TOWN.p) {
    const a = actor || TOWN.p;
    TOWN.followers.push(newActor(a.x, a.y, a.dir));
    if (actor) TOWN.npcs = TOWN.npcs.filter(n => n !== actor);
  }
  return m;
}

function newMember(d) { const m = { id: d.id, lv: 1, xp: 0, hp: 0, mp: 0, bonus: {} }; m.hp = maxHp(m); m.mp = maxMp(m); return m; }

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
  if ((id === 'pocao' || id === 'eter') && target.hp <= 0) return `${name} caiu. ${id === 'pocao' ? 'A poção' : 'O éter'} não tem efeito.`;
  if (id === 'pocao' && target.hp >= maxHp(target)) return `${name} já está com os PV cheios.`;
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
    case 'pocao': msg = `${pdef(target).name} recupera ${healHp(target, 50)} PV.`; Sfx.heal(); break;
    case 'eter': msg = `${pdef(target).name} recupera ${healMp(target, 20)} PM.`; Sfx.heal(); break;
    case 'pena': revive(target, 0.5); msg = `${pdef(target).name} voltou à vida!`; Sfx.holy(); break;
    case 'elixir':
      for (const m of G.party) { m.hp = maxHp(m); m.mp = maxMp(m); UI.cardGlow(m); }
      msg = 'O Elixir restaura todo o grupo!'; Sfx.holy(); break;
  }
  UI.updateParty();
  return msg;
}

// Magias de suporte (usadas em batalha e fora dela)
function castSupport(caster, spellId, target) {
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
    const got = healHp(target, amount()); UI.updateParty();
    return `${pdef(target).name} recupera ${got} PV.`;
  }
  if (sp.kind === 'revive') {
    if (target.hp > 0) return `${pdef(target).name} já está de pé.`;
    revive(target, 0.5); Sfx.holy(); UI.updateParty();
    return `${pdef(target).name} voltou à vida!`;
  }
  return `${c} hesita.`;
}

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
  return UI.choose(opts, { title, cancel: true, cols: G.party.length > 3 ? 2 : 3, ...o });
}

function itemOptions() {
  return Object.keys(ITEMS).filter(k => G.inv[k] > 0).map(k => ({ label: `${ITEMS[k].name} x${G.inv[k]}`, hint: ITEMS[k].desc, value: k }));
}

function levelUpMessages(m) {
  const msgs = [];
  while (m.xp >= xpNext(m.lv)) {
    m.xp -= xpNext(m.lv);
    const oh = maxHp(m), om = maxMp(m), old = {};
    ['atk', 'def', 'mag', 'agi'].forEach(k => old[k] = stat(m, k));
    m.lv++;
    m.hp += maxHp(m) - oh; m.mp += maxMp(m) - om;
    const ups = ['atk', 'def', 'mag', 'agi'].map(k => [k, stat(m, k) - old[k]]).filter(([, v]) => v > 0)
      .map(([k, v]) => `${STAT_NAMES[k]}+${v}`).join(' ');
    let s = `${pdef(m).name} subiu para o nível ${m.lv}!\nPV+${maxHp(m) - oh} PM+${maxMp(m) - om} ${ups}`;
    const learned = pdef(m).spells.filter(([lv]) => lv === m.lv).map(([, id]) => SPELLS[id].name);
    if (learned.length) s += `\nAprendeu: ${learned.join(', ')}!`;
    msgs.push(s);
  }
  return msgs;
}
