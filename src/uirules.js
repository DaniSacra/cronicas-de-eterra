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
    { label: 'Itens', value: 'item', disabled: s.bagCount === 0 }, { label: 'Magia', value: 'magic' }, { label: 'Status', value: 'status' },
    { label: 'Diário', value: 'diary' }, { label: 'Mundo', value: 'world' }, { label: 'Salvar', value: 'save' },
  ];
  if (!s.inTown) opts.push({ label: 'Mapa', value: 'map' });
  opts.push({ label: 'Voltar', value: null });
  return { title: `Menu · ${s.gold} moedas`, opts };
}

if (typeof module !== 'undefined') module.exports = { crispPx, fontScale, placeLabel, healthWord, campMenuOpts };
