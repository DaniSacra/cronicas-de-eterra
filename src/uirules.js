// ===== UI rules: pure functions shared by the game and the tests (no DOM, no game state) =====

// Press Start 2P is drawn on an 8 px grid: it is crisp only when the size in device pixels is a multiple of 8
function crispPx(target, dpr = 1) {
  return Math.max(1, Math.round(target * dpr / 8)) * 8 / dpr;
}

// One type scale for the whole UI (docs/ui-spec.md §5). w, h in CSS px.
function fontScale(w, h, dpr = 1) {
  const land = w >= h, huge = land && w >= 1700, large = land && w >= 1200 && h >= 700, small = w <= 900 || h <= 500;
  const t1 = huge || large ? 16 : 8; // small text: 16 on a PC screen (2026-11-06), 8 on small ones
  const t2 = huge ? 24 : small ? 12 : 16;
  const td = huge || large ? 24 : small ? 12 : 16; // dialog text
  return { f1: crispPx(t1, dpr), f2: crispPx(t2, dpr), fd: crispPx(td, dpr) };
}

// Place + coins label: only while walking (town or crypt); hidden in battle, title and game over
function placeLabel(s) {
  if (s.mode === 'town') return { text: s.areaName, gold: s.gold };
  if (s.mode === 'explore') return { text: `${s.floorShort} · ${s.floorName}`, gold: s.gold };
  return null;
}

// Enemy health in words for the target list (exact numbers stay hidden)
function healthWord(hp, maxhp) {
  const k = hp / maxhp;
  return k > 0.7 ? 'ileso' : k > 0.4 ? 'ferido' : k > 0.15 ? 'muito ferido' : 'quase caindo';
}

// Camp menu: a column of icons in three groups (adventure, information, system), split by a rule (sep).
// Magia and Item are quick shortcuts (choose, aim, use) beside the full Livro and Bolsa screens; each is grey when
// there is nothing to use. Mapa only in the crypt; no coins (the corner shows them) and no Voltar (Esc)
function campMenuOpts(s) {
  const groups = [
    [{ label: 'Magia', value: 'magic', icon: 'spell', disabled: !s.canCast }, { label: 'Item', value: 'item', icon: 'pocao', disabled: !s.itemCount },
      { label: 'Bolsa', value: 'bag', icon: 'item', disabled: s.bagCount === 0 }, { label: 'Livro', value: 'book', icon: 'livro' },
      { label: 'Heróis', value: 'status', icon: 'heroi' }, { label: 'Táticas', value: 'macros', icon: 'tatica' }],
    [{ label: 'Diário', value: 'diary', icon: 'diario' }, { label: 'Mundo', value: 'world', icon: 'mundo' }, ...(s.inTown ? [] : [{ label: 'Mapa', value: 'map', icon: 'mapa' }])],
    [{ label: 'Salvar', value: 'save', icon: 'salvar' }, { label: 'Sair', value: 'quit', icon: 'sair' }],
  ];
  return { opts: groups.flatMap((g, i) => g.map((o, j) => (i && !j ? { ...o, sep: true } : o))) };
}

// Starting over replaces the save: with one, ask first, with No already selected
async function replaceSaveOk(saved) {
  return !saved || UI.choose([{ label: 'Sim', value: true }, { label: 'Não', value: false }],
    { title: 'Começar de novo? O jogo salvo será substituído.', cols: 1, start: false });
}

// Equipment screen: what one hero carries in each slot, from the ids of the equipment the party found
const GEAR_SLOTS = [['arma', 'Arma'], ['armadura', 'Armadura']];
function heroGear(heroId, ownedIds, equips) {
  return GEAR_SLOTS.map(([slot, label]) => ({
    slot, label, items: ownedIds.filter(id => equips[id] && equips[id].who === heroId && equips[id].slot === slot).map(id => ({ id, ...equips[id] })),
  }));
}
// "ATQ +6, DEF +5"
const bonusText = (bonus, names) => Object.entries(bonus).map(([k, v]) => `${names[k]} +${v}`).join(', ');

// Party talks (docs/mundo/historias/prologo.md, "Conversas do grupo"): each talk plays once per save.
// takeTalk marks it in `seen` and says whether it should play now.
function takeTalk(seen, id) {
  const k = 'talk:' + id;
  if (seen[k]) return false;
  seen[k] = 1;
  return true;
}
// Crypt light: the party's torch is warm up close and fades to a cold blue with distance (docs/arte/estilo.md)
function torchTint(d) {
  const k = d < 1 ? 0 : d > 6 ? 1 : (d - 1) / 5;
  return [1.18 - 0.4 * k, 1.0 - 0.1 * k, 0.76 + 0.42 * k];
}
// A speaker may carry a mood for the portrait: "Aldo~bravo" shows "Aldo" with the angry face
function splitMood(name) {
  const m = /^(.*?)~(alegre|preocupado|bravo)$/.exec(name || '');
  return m ? { name: m[1], mood: m[2] } : { name: name || null, mood: null };
}
// "Nome:\ntexto" -> who speaks and what; a title or line without a name gives who = null
function splitSpeaker(text) {
  const m = /^([^\n:]{1,28}):\n([\s\S]+)$/.exec(text || '');
  return m ? { who: m[1], text: m[2] } : { who: null, text: text || '' };
}
// Face on a party card: worried when hurt, fierce on its turn in battle, else the normal face
function cardMood(hp, maxHp, acting) {
  if (hp <= 0) return 'normal';
  if (hp < maxHp * 0.3) return 'preocupado';
  return acting ? 'bravo' : 'normal';
}
// Lines are [who, text]: who is a hero id (dropped when that hero is not in the party),
// any other speaker name, or null for narration.
const talkLines = (lines, heroIds, inParty) => lines.filter(([who]) => !heroIds.includes(who) || inParty(who));


// Screen fit: logical resolution follows the window at a whole scale of device pixels (base 320x180 at 4x in 1280x720)
// o.room: a small area (logical px) that should fill the view: zoom in up to 1.5x the normal scale, never less
function viewFit(bw, bh, o = {}) {
  const s = Math.max(1, Math.floor(Math.min(bw / 288, bh / 180)));
  const z = o.room ? Math.max(s, Math.min(Math.floor(s * 1.5), Math.floor(Math.max(bw / o.room.w, bh / o.room.h)))) : s;
  const lo = z > s ? 1 : 0; // zoomed in, the view may be smaller than 288x180
  let w = Math.min(512, Math.max(lo || 288, Math.ceil(bw / z))), h = Math.min(900, Math.max(lo || 180, Math.ceil(bh / z)));
  w += w & 1; h += h & 1;
  return { w, h, s: z };
}
// Town camera on one axis: centered on the party in the part of the view left free (pad: rows covered by the
// dialog box at the bottom), so it may go past the bottom edge while the box is open; small areas stay centered.
// Room the camera keeps for the dialog box. Within a scene (busy) it never shrinks: lines with or without a face, one
// line or three, and the short gaps between them would make the scene dance up and down. Free again, it lets go.
// Height (CSS px) missing for the text box to hold `lines` lines (line height lh, padding and border pad)
const boxRoom = (h, lh, pad, lines = 5) => Math.max(0, Math.ceil(lh * lines + pad - h));
function dialogPad(hold, rows, busy) { return rows > 0 ? Math.max(hold, rows) : busy ? hold : 0; }
function camAxis(pos, size, view, pad = 0) {
  const v = view - pad;
  return Math.round(size < v ? (size - v) / 2 : Math.max(0, Math.min(size - v, pos + 8 - v / 2)));
}
// Town camera with the dialog open: it moves only when the box would cover the party, and only as much as
// needed to keep the party (16 px tall, plus a small margin) above the box; never past the centered view
function camLift(pos, size, view, pad = 0) {
  const base = camAxis(pos, size, view);
  if (!pad) return base;
  const need = Math.round(pos + 20 - (view - pad));
  return Math.max(base, Math.min(camAxis(pos, size, view, pad), need));
}

// Battle: enemies stand on a floor line just above the command bar, at the biggest whole scale that fits
// their slot (art pixels stay square, never blurry). Common enemies keep room for the HP bar under them.
const BATTLE_FLOOR = 0.685, BATTLE_MAX_SCALE = 3, BATTLE_SAFE_TOP = 0.26, BATTLE_BACK = 0.08;
// Common enemies stand on the ground of the painted backdrop (src/battlebg.js): the first, third... a row farther back
// (BATTLE_BACK of the height, as far as the HUD allows), the others in front, like a group spread on a field.
// A lone enemy stands in the front row: at the back it sits on the horizon, where the props are tiny, and looks pasted on
function battleLayout(sizes, vw, vh, boss = false) {
  const floor = Math.round(vh * BATTLE_FLOOR), n = sizes.length, slot = Math.floor(vw / n);
  const base = boss ? floor : floor - 12, safe = Math.round(vh * (boss ? 0.17 : BATTLE_SAFE_TOP));
  // one scale for the whole group, so every pixel in the scene has the same size
  const scale = Math.max(1, Math.min(BATTLE_MAX_SCALE, ...sizes.map(({ w, h, float }) =>
    Math.min(Math.floor((boss ? vw - 8 : slot - 2) / w), Math.floor((base - (float ? 8 : 0) - safe) / h)))));
  const back = boss || sizes.length < 2 ? 0 : Math.max(0, Math.min(Math.round(vh * BATTLE_BACK), ...sizes.map(({ h, float }) => base - (float ? 8 : 0) - safe - h * scale)));
  return sizes.map(({ w, h, float }, i) => {
    const x = boss ? Math.round(vw / 2) : Math.round(vw / 2 + (i - (n - 1) / 2) * slot);
    const W = w * scale, H = h * scale, left = x - Math.floor(W / 2), lift = float ? 8 : 0; // flyers hover over their shadow
    const b = base - (i % 2 === 0 ? back : 0);
    return { x, base: b, scale, w: W, h: H, left, top: b - H - lift };
  });
}

// ---------- Heroes screen (src/equipview.js) ----------
// What each slot shows: the best equipment found for that hero, or the hero's starting gear (never an empty box)
// One hero wears the strongest piece of each slot (bonus points added up); the rest stays in the bag
const gearPower = e => Object.values(e.bonus).reduce((s, v) => s + v, 0);
function bestGear(heroId, slot, ownedIds, equips) {
  let best = null;
  for (const id of ownedIds) { const e = equips[id]; if (e && e.who === heroId && e.slot === slot && (!best || gearPower(e) >= gearPower(equips[best]))) best = id; }
  return best;
}
// What the hero wears in a slot: the player's choice (G.equip[heroId][slot]) while the party still owns it, else the strongest
function equippedGear(heroId, slot, ownedIds, equips, choice = {}) {
  const c = choice[heroId] && choice[heroId][slot], e = c && equips[c];
  return e && e.who === heroId && e.slot === slot && ownedIds.includes(c) ? c : bestGear(heroId, slot, ownedIds, equips);
}
// Bonus change from wearing `to` in place of `from` (either may be null: the starting gear gives nothing)
function bonusDiff(to, from, equips) {
  const a = to ? equips[to].bonus : {}, b = from ? equips[from].bonus : {}, d = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const v = (a[k] || 0) - (b[k] || 0); if (v) d[k] = v; }
  return d;
}
// What a new piece changes on its hero's bonus: nothing when what the hero wears in that slot is as strong,
// otherwise the new piece's bonus minus the one it replaces (ownedIds: what the party had before)
function equipDelta(id, ownedIds, equips, choice = {}) {
  const e = equips[id], prev = equippedGear(e.who, e.slot, ownedIds, equips, choice);
  if (prev && gearPower(equips[prev]) >= gearPower(e)) return {};
  return bonusDiff(id, prev, equips);
}
// The equipment screen's list for one hero and slot: every piece the party has for it, its bonus,
// the difference to what is worn now and which one is worn
function gearChoices(heroId, slot, ownedIds, equips, choice = {}) {
  const now = equippedGear(heroId, slot, ownedIds, equips, choice);
  return [...new Set(ownedIds)].filter(id => equips[id] && equips[id].who === heroId && equips[id].slot === slot)
    .map(id => ({ id, name: equips[id].name, icon: equips[id].icon, bonus: equips[id].bonus, diff: bonusDiff(id, now, equips), equipped: id === now }));
}
// "Melhor": the strongest piece of each slot of one hero, as the choice to keep
const bestChoice = (heroId, ownedIds, equips) => Object.fromEntries(GEAR_SLOTS.map(([slot]) => [slot, bestGear(heroId, slot, ownedIds, equips)]).filter(([, id]) => id));

function slotGear(heroId, ownedIds, equips, start, choice = {}) {
  return heroGear(heroId, ownedIds, equips).map(s => {
    const it = s.items.find(i => i.id === equippedGear(heroId, s.slot, ownedIds, equips, choice));
    return it ? { slot: s.slot, label: s.label, name: it.name, icon: it.icon, bonus: it.bonus, id: it.id, start: false }
      : { slot: s.slot, label: s.label, ...start[heroId][s.slot], bonus: {}, start: true };
  });
}
// Saves from the 3-floor version: gear found on floors that no longer exist is read back from the bonus it left on
// each hero, the biggest pieces first (Espada de Prata before Espada de Ferro)
function gearFromBonus(party, ownedIds, equips) {
  const size = b => Object.values(b).reduce((s, v) => s + v, 0), found = [];
  for (const m of party) {
    const left = { ...m.bonus };
    for (const id of ownedIds) if (equips[id].who === m.id) for (const [k, v] of Object.entries(equips[id].bonus)) left[k] = (left[k] || 0) - v;
    const cands = Object.keys(equips).filter(id => equips[id].who === m.id && !ownedIds.includes(id)).sort((a, b) => size(equips[b].bonus) - size(equips[a].bonus));
    for (const id of cands) {
      const b = Object.entries(equips[id].bonus);
      if (b.every(([k, v]) => (left[k] || 0) >= v)) { b.forEach(([k, v]) => { left[k] -= v; }); found.push(id); }
    }
  }
  return found;
}
// Colors of the full-body sprite: the base palette with each found equipment's look on top
// (only what the hero wears: the weapon in hand is the equipped one)
const bodyPal = (pal, heroId, ownedIds, equips, looks, choice = {}) =>
  Object.assign({}, pal, ...GEAR_SLOTS.map(([slot]) => equippedGear(heroId, slot, ownedIds, equips, choice)).filter(id => id && looks[id]).map(id => looks[id]));

// Skills book: every skill of the hero by level, known or still to come
const spellBook = (spells, lv) => spells.map(([at, id]) => ({ id, lv: at, known: lv >= at }));
const TARGET_TEXT = { enemy: 'Um inimigo', allEnemies: 'Todos os inimigos', ally: 'Um aliado', deadAlly: 'Um aliado caído', allAllies: 'O grupo' };
const KIND_ICON = { phys: 'atk', heal: 'cura', revive: 'cura', holy: 'luz' };
const FX_ICON = { fire: 'fogo', ice: 'spell', bolt: 'raio' };
const spellIcon = sp => FX_ICON[sp.fx] || KIND_ICON[sp.kind] || 'spell';
// Magia from the camp menu: one line per field spell of each hero ({ id, name, hp, mp, spells: [spellId] }),
// grey with the reason when it cannot be cast now
const fieldCasts = (heroes, SPELLS) => heroes.flatMap(h => h.spells.filter(id => SPELLS[id].field).map(id => {
  const u = fieldUse(SPELLS[id], h);
  return { label: SPELLS[id].name, hint: `${h.name} · ${u.ok ? SPELLS[id].mp + ' PM' : u.why}`, value: { who: h.id, spell: id }, disabled: !u.ok };
}));
// The book's Usar button: only skills that work outside battle (heals); grey with the reason otherwise
function fieldUse(sp, caster) {
  if (!sp.field) return { field: false, ok: false, why: 'Só em batalha' };
  if (caster.hp <= 0) return { field: true, ok: false, why: 'Caído não usa' };
  if (caster.mp < sp.mp) return { field: true, ok: false, why: `Faltam ${sp.mp - caster.mp} PM` }; // field skills are all magic (PM)
  return { field: true, ok: true, why: '' };
}
// What a skill does, in simple numbers for this hero (s: total atk and mag), before the target's defense
function spellEffect(sp, s) {
  const each = sp.target === 'allEnemies' || sp.target === 'allAllies' ? ' em cada um' : '';
  if (sp.kind === 'heal') return `Recupera cerca de ${Math.round(s.mag * sp.power + sp.base)} PV${each}`;
  if (sp.kind === 'revive') return 'Levanta um aliado caído com metade dos PV';
  if (sp.kind === 'phys') return `Cerca de ${Math.round(s.atk * sp.power)} de dano${each}` + (sp.pierce ? ', sem contar a armadura' : sp.bone ? `, ${Math.round(s.atk * sp.power * sp.bone)} nos mortos-vivos` : '');
  return `Cerca de ${Math.round(s.mag * sp.power + sp.base)} de dano${each}`;
}

// Attributes: one row each, with the equipment bonus and a bar against the best of the party (0..1)
const STAT_KEYS = ['atk', 'def', 'mag', 'res', 'agi'];
function statRows(values, i) {
  return STAT_KEYS.map(k => {
    const best = Math.max(1, ...values.map(v => v.total[k]));
    return { key: k, value: values[i].total[k], bonus: values[i].bonus[k] || 0, frac: values[i].total[k] / best };
  });
}
// "Faltam 12 XP para o nível 3"
const xpLeftText = (xp, lv, next) => `Faltam ${Math.max(0, next - xp)} XP para o nível\u00a0${lv + 1}`; // "nível 4" never splits

// A hero's story grows with the game: each line has a flag (or none) and shows once the flag is set;
// only the last STORY_MAX show, so the sheet never scrolls
const STORY_MAX = 3;
const storyLines = (lines, flags) => lines.filter(l => !l.when || flags[l.when]).map(l => l.text).slice(-STORY_MAX);
// The quote: the last unlocked one
const storyQuote = (quotes, flags) => storyLines(quotes, flags).at(-1) || '';

// The party bag in three tabs (always three, maybe empty); the letter keeps its sealed name until it is read
function bagTabs({ inv, key, owned, items, equips, keyItems, read, equip = {} }) {
  const worn = id => equippedGear(equips[id].who, equips[id].slot, owned, equips, equip) === id;
  return [
    { title: 'Consumíveis', cells: Object.keys(items).filter(k => inv[k] > 0).map(k => ({ id: k, kind: 'item', icon: k, name: items[k].name, n: inv[k], desc: items[k].desc })) },
    { title: 'Equipamentos', cells: [...new Set(owned)].filter(id => equips[id]).map(id => ({ id, kind: 'equip', icon: equips[id].icon, name: equips[id].name, n: 0,
      who: equips[id].who, inUse: worn(id), desc: equips[id].slot === 'arma' ? 'Arma' : 'Armadura' })) },
    { title: 'Itens-chave', cells: Object.keys(keyItems).filter(k => key[k]).map(k => ({ id: k, kind: 'key', icon: k, n: 0, desc: keyItems[k].desc,
      name: read || !keyItems[k].sealedName ? keyItems[k].name : keyItems[k].sealedName })) },
  ];
}
const bagGroups = o => bagTabs(o).filter(g => g.cells.length);

// Two columns (Heróis: stage and sheet; Livro: both pages) when there is room; on a phone (portrait, or landscape
// with little height) one at a time
const heroViewMode = (w, h) => (w < h || w < 900 || h < 520 ? 'tabs' : 'cols');
// Views that Tab, Q and E cycle through on the Heróis screen: none in two columns, Palco and Ficha on a phone
const heroViewViews = mode => (mode === 'tabs' ? ['stage', 'sheet'] : []);
// Text sizes of the screen: body at the menu size (never under 8 px of the font at a whole scale), titles at the dialog size
function heroViewFonts(w, h, dpr = 1) {
  const f = fontScale(w, h, dpr);
  return { body: f.f2, big: f.fd };
}

// Battle names: the dice girl is "Moça" on her card and "Mç" in the turn queue; lines keep "Moça dos dados"
const shortName = name => (name === 'Moça dos dados' ? 'Moça' : name);
// Names in the middle of a line keep their article: "ataca o Sineiro", "Fogo no Sineiro", "Truque da moça dos dados";
// plain names stay plain ("em Aldo", "de Lyra"). prep: '', 'em' or 'de'
const ARTICLE_NAMES = { 'O Sineiro': ['o', 'Sineiro'], 'Moça dos dados': ['a', 'moça dos dados'] };
function midName(name, prep = '') {
  const a = ARTICLE_NAMES[name];
  if (!a) return prep ? `${prep} ${name}` : name;
  return `${prep ? { em: 'n', de: 'd' }[prep] + a[0] : a[0]} ${a[1]}`;
}
const queueTag = name => (name === 'Moça dos dados' ? 'Mç' : name.slice(0, 2));
// "Lyra usa Fogo em Encapuzado B!" when the spell hits one enemy; just the spell otherwise
const spellLine = (who, spell, target) => `${who} usa ${spell}${target ? ' ' + midName(target, 'em') : ''}!`;
// Before the boss: a warning when the party is still weak (average level under 4); empty otherwise
const bossWarning = party => (party.reduce((s, m) => s + m.lv, 0) / party.length < 4 ? 'O sino pesa. Talvez seja melhor voltar mais forte.\n' : '');

// Control hints: each "key action" pair never breaks across lines ("Esc menu" stays together)
const keepPairs = s => s.split(' · ').map(p => p.replace(/ /g, '\u00a0')).join('\u00a0· '); // the dot goes down with the pair before it
// The note's place: low, above the party strip, in areas with fog of sight; at the top everywhere else
const hintHome = (mode, vision) => (mode === 'town' && vision ? 'bottom' : 'hudbar');

// Title menu: the quick start straight into the crypt is a test shortcut, only with ?dev in the address
// ---------- Hit rolls (combat Phase 2, the cut Daniel kept: Andilla's crit, the same luck on both sides) ----------
// Every physical attack, from either side: a flat miss, then the target dodges by Agility, then a critical hit.
// Andilla crits more (Olho de Ladra); the boss never crits, so a single blow of his cannot take a hero in one go.
const HIT = { miss: 0.05, crit: 0.08, critMul: 1.7, dodgeBase: 0.04, dodgePerAgi: 0.003, dodgeCap: 0.25 };
const CRIT_BY_HERO = { andilla: 0.25 };
const critChance = heroId => CRIT_BY_HERO[heroId] ?? HIT.crit;
const dodgeChance = agi => Math.min(HIT.dodgeCap, HIT.dodgeBase + agi * HIT.dodgePerAgi);
function rollHit(critP, targetAgi, rand = Math.random) {
  if (rand() < HIT.miss) return 'miss';
  if (rand() < dodgeChance(targetAgi)) return 'dodge';
  return rand() < critP ? 'crit' : 'hit';
}
// Who speaks when a hero falls: the sibling first, then the cleric, then whoever still stands
const FALL_REACTS = { aldo: ['lyra', 'teo', 'andilla'], lyra: ['aldo', 'teo', 'andilla'], teo: ['lyra', 'aldo', 'andilla'], andilla: ['teo', 'aldo', 'lyra'] };
const fallReactor = (fallenId, standingIds) => (FALL_REACTS[fallenId] || []).find(id => standingIds.includes(id)) || null;

// Clara calls Aldo over: the first time he passes within CLARA_CALL steps of her, while he still walks alone
const CLARA_CALL = 5;
const claraCalls = (seen, partySize, aldo, clara) => partySize === 1 && !seen['talk:clara'] && !seen['talk:claraLyra']
  && Math.abs(aldo.x - clara.x) + Math.abs(aldo.y - clara.y) <= CLARA_CALL;

// Shortest walk on a grid (breadth first): from `from` to a tile where goal(x, y) holds, through tiles where free(x, y)
// holds; the list of steps, without the start ([] when already there, null when there is no way within `limit` tiles)
function gridPath(from, goal, free, limit = 400) {
  const key = (x, y) => x + ',' + y, prev = new Map([[key(from.x, from.y), null]]), queue = [[from.x, from.y]];
  while (queue.length && prev.size <= limit) {
    const [x, y] = queue.shift();
    if (goal(x, y)) {
      const path = [];
      for (let k = key(x, y); prev.get(k); k = prev.get(k)) path.unshift(k.split(',').map(Number));
      return path;
    }
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (prev.has(k) || !free(nx, ny)) continue;
      prev.set(k, key(x, y)); queue.push([nx, ny]);
    }
  }
  return null;
}

// Random encounters, the same in the crypt and in the open areas: none in the first 5 steps after a fight, then a
// chance that grows a little with every step, up to 22%
const encounterChance = since => (since < 5 ? 0 : Math.min(0.22, 0.05 + (since - 5) * 0.012));

const titleOptions = (save, dev) => [{ label: 'Novo Jogo', value: 'new' }, { label: 'Continuar', value: 'load', disabled: !save },
  ...(dev ? [{ label: 'Começar em...', hint: 'modo dev', value: 'dev' }] : [])];

if (typeof module !== 'undefined') module.exports = { equippedGear, bonusDiff, gearChoices, bestChoice, HIT, critChance, dodgeChance, rollHit, fallReactor, bestGear, equipDelta, gearPower, claraCalls, CLARA_CALL, gridPath, gearFromBonus, midName, replaceSaveOk, boxRoom, keepPairs, hintHome, dialogPad, shortName, queueTag, spellLine, bossWarning, encounterChance, titleOptions, viewFit, camAxis, camLift, battleLayout, BATTLE_FLOOR, crispPx, fontScale, placeLabel, healthWord, campMenuOpts, fieldCasts, heroGear, bonusText, takeTalk, talkLines, splitMood, splitSpeaker, cardMood, torchTint,
  slotGear, bodyPal, spellBook, TARGET_TEXT, spellIcon, STAT_KEYS, statRows, xpLeftText, storyLines, storyQuote, STORY_MAX, bagGroups, bagTabs, fieldUse, spellEffect, heroViewMode, heroViewViews, heroViewFonts };
