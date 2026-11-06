// ===== UI rules: pure functions shared by the game and the tests (no DOM, no game state) =====

// Press Start 2P is drawn on an 8 px grid: it is crisp only when the size in device pixels is a multiple of 8
function crispPx(target, dpr = 1) {
  return Math.max(1, Math.round(target * dpr / 8)) * 8 / dpr;
}

// One type scale for the whole UI (docs/ui-spec.md §5). w, h in CSS px.
function fontScale(w, h, dpr = 1) {
  const land = w >= h, huge = land && w >= 1700, large = land && w >= 1200 && h >= 700, small = w <= 900 || h <= 500;
  const t1 = huge ? 16 : 8;
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

// Camp menu: coins in the title, Mapa only in the crypt, Itens greyed out while the bag is empty
function campMenuOpts(s) {
  const opts = [
    { label: 'Itens', value: 'item', disabled: s.bagCount === 0 }, { label: 'Magia', value: 'magic' }, { label: 'Heróis', value: 'status' },
    { label: 'Táticas', value: 'macros' }, { label: 'Diário', value: 'diary' }, { label: 'Mundo', value: 'world' }, { label: 'Salvar', value: 'save' },
  ];
  if (!s.inTown) opts.push({ label: 'Mapa', value: 'map' });
  opts.push({ label: 'Sair', value: 'quit' }, { label: 'Voltar', value: null });
  return { title: `Menu · ${s.gold} moedas`, opts };
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

// Party talks (docs/mundo/historias/capitulo1.md, "Conversas do grupo"): each talk plays once per save.
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
function viewFit(bw, bh) {
  const s = Math.max(1, Math.floor(Math.min(bw / 288, bh / 180)));
  let w = Math.min(512, Math.max(288, Math.ceil(bw / s))), h = Math.min(900, Math.max(180, Math.ceil(bh / s)));
  w += w & 1; h += h & 1;
  return { w, h, s };
}

// Battle: enemies stand on a floor line just above the command bar, at the biggest whole scale that fits
// their slot (art pixels stay square, never blurry). Common enemies keep room for the HP bar under them.
const BATTLE_FLOOR = 0.685, BATTLE_MAX_SCALE = 3, BATTLE_SAFE_TOP = 0.26;
function battleLayout(sizes, vw, vh, boss = false) {
  const floor = Math.round(vh * BATTLE_FLOOR), n = sizes.length, slot = Math.floor(vw / n);
  const base = boss ? floor : floor - 12, safe = Math.round(vh * (boss ? 0.17 : BATTLE_SAFE_TOP));
  // one scale for the whole group, so every pixel in the scene has the same size
  const scale = Math.max(1, Math.min(BATTLE_MAX_SCALE, ...sizes.map(({ w, h, float }) =>
    Math.min(Math.floor((boss ? vw - 8 : slot - 2) / w), Math.floor((base - (float ? 8 : 0) - safe) / h)))));
  return sizes.map(({ w, h, float }, i) => {
    const x = boss ? Math.round(vw / 2) : Math.round(vw / 2 + (i - (n - 1) / 2) * slot);
    const W = w * scale, H = h * scale, left = x - Math.floor(W / 2), lift = float ? 8 : 0; // flyers hover over their shadow
    return { x, base, scale, w: W, h: H, left, top: base - H - lift };
  });
}

if (typeof module !== 'undefined') module.exports = { viewFit, battleLayout, BATTLE_FLOOR, crispPx, fontScale, placeLabel, healthWord, campMenuOpts, heroGear, bonusText, takeTalk, talkLines, splitMood, splitSpeaker, cardMood, torchTint };
