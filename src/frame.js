// ===== UI kit: 9-slice window frame, 16 px icons and cursor, all drawn from character grids =====
// Spec: docs/ui-spec.md. Approved mockups: docs/mockups/.
// Everything is drawn from character grids: one letter = one palette color, "." = transparent.
// Pure helpers (grids, states) work in Node for tests; the canvas/data-URL part runs in the browser.

const UI_PAL = {
  k: '#0a0c1a', // ink: outlines
  w: '#18203c', // window fill
  W: '#222c50', // window fill, lighter band (selection row, slots)
  r: '#9fb3d1', // frame: frost steel
  s: '#56688c', // frame shadow
  t: '#eef1f7', // text / white highlight
  m: '#8d97b5', // dim text
  x: '#4b5472', // disabled
  g: '#f0c04a', // gold highlight
  o: '#a8781e', // gold shadow
  h: '#d9504a', H: '#f28a6a', // HP
  p: '#4a8fe0', P: '#9fcaff', // MP
  d: '#b8325a', D: '#6a1a34', // danger
  b: '#7a4a22', n: '#a3683a', // leather
  y: '#e8d9a8', // parchment
  B: '#2a4f9a', // deep blue (ether)
  // window kit: warm parchment in a wooden frame with a brass trim (letters used only by the frame)
  K: '#24140a', // frame outline
  f: '#9a6236', // wood
  F: '#5c3318', // dark wood
  q: '#ecd8aa', // parchment
  Q: '#d6b984', // parchment, darker (slots, inset)
};

// ---------- 9-slice frame: 16×16 tile, 3 px corners, 10 px tileable edges ----------
const FRAME_SLICE = 4;
const FRAME_GRID = [
  '..KKKKKKKKKKKK..',
  '.KffffffffffffK.',
  'KfgFFFFFFFFFFgfK',
  'KfFooooooooooFfK',
  'KfFoqqqqqqqqoFfK',
  'KfFoqqqqqqqqoFfK',
  'KfFoqqqqqqqqoFfK',
  'KfFoqqqqqqqqoFfK',
  'KfFoqqqqqqqqoFfK',
  'KfFoqqqqqqqqoFfK',
  'KfFoqqqqqqqqoFfK',
  'KfFoqqqqqqqqoFfK',
  'KfFooooooooooFfK',
  'KfgFFFFFFFFFFgfK',
  '.KffffffffffffK.',
  '..KKKKKKKKKKKK..',
];
// Variants recolor the same grid: one shape, several roles.
const FRAME_VARIANTS = {
  base:   {},
  sel:    { f: 'g', F: 'o', g: 't' },          // active card, chosen command, focused button
  danger: { f: 'd', F: 'D' },                  // boss bar, low-HP warning
  slot:   { f: 'F', F: 'F', o: 'K', g: 'F', q: 'Q' },  // inner slots: icons, turn queue, map list rows
};

const recolor = (grid, map) => grid.map(row => [...row].map(ch => map[ch] || ch).join(''));
const frameGrid = (variant = 'base') => recolor(FRAME_GRID, FRAME_VARIANTS[variant] || {});

// The 9 pieces as rectangles {x, y, w, h} in the 16×16 source (what border-image-slice: FRAME_SLICE cuts)
function frameSlices(size = 16, s = FRAME_SLICE) {
  const m = size - 2 * s, cols = [[0, s], [s, m], [size - s, s]];
  const names = [['tl', 't', 'tr'], ['l', 'c', 'r'], ['bl', 'b', 'br']];
  const out = {};
  cols.forEach(([y, h], j) => cols.forEach(([x, w], i) => { out[names[j][i]] = { x, y, w, h }; }));
  return out;
}

// ---------- Icons: 16×16, three states derived from one drawing ----------
const POTION = [
  '................', '......kkkk......', '......knnk......', '......kbbk......', '.....ktsssk.....', '....ktsssssk....',
  '...ktLLLLLLsk...', '..ktLLLLLLLLsk..', '..kLtLLLLLLLDk..', '..kLLLLLLLLLDk..', '..kLLLLLLLLDDk..', '...kDLLLLLDDk...',
  '....kkDDDDkk....', '......kkkk......', '................', '................'];
const ICON_ART = {
  atk: [ // sword
    '................', '............kkk.', '...........ktsk.', '..........ktsk..', '.........ktsk...', '........ktsk....',
    '.......ktsk.....', '..kk..ktsk......', '..kgkktsk.......', '...kgksk........', '....kgk.........', '...kbkgk........',
    '..kbk.kgk.......', '.kbk...kk.......', '.kk.............', '................'],
  spell: [ // frost star
    '................', '.......kk.......', '......kPPk......', '......kPPk......', '..k...kPPk...k..', '.kPk.kPttPk.kPk.',
    '..k.kPttttPk.k..', '.kkkPttttttPkkk.', 'kPPPPttttttPPPPk', '.kkkPttttttPkkk.', '..k.kPttttPk.k..', '.kPk.kPttPk.kPk.',
    '..k...kPPk...k..', '......kPPk......', '......kPPk......', '.......kk.......'],
  item: [ // pouch
    '................', '......kkkk......', '.....knnnnk.....', '......kggk......', '.....knnnnk.....', '....knnnnnnk....',
    '...knntnnnnnk...', '..knntnnnnnnnk..', '..kntnnnnnnnnk..', '..knnnnnnnnnbk..', '..knnnnnnnnnbk..', '..knnnnnnnnbbk..',
    '...kbnnnnnbbk...', '....kbbbbbbk....', '.....kkkkkk.....', '................'],
  def: [ // shield
    '................', '..kkkkkkkkkkkk..', '..krrrrrrrrrrk..', '..krppppppppsk..', '..krpppggpppsk..', '..krpppggpppsk..',
    '..krpggggggpsk..', '..krpggggggpsk..', '..krpppggpppsk..', '...krppggppsk...', '...krppggppsk...', '....krppppsk....',
    '.....krppsk.....', '......kssk......', '.......kk.......', '................'],
  run: [ // boot with speed lines
    '................', '................', '........kkkk....', '.......knnnnk...', '.......knbbnk...', 'kkk....knnnnk...',
    '.......knnnnk...', '.kkkk..knnnnk...', '......knnnnnk...', '..kk.knnnnnnnk..', '.....knnnnnnnnk.', '....knnnnnnnnnnk',
    '....kbbbbbbbbbbk', '.....kkkkkkkkkk.', '................', '................'],
  mundo: [ // globe for the MUNDO button
    '................', '.....kkkkkk.....', '...kkppppppkk...', '..kppyyppppppk..', '.kppyyyyppyyppk.', '.kpyyyyyppyyypk.',
    'kppyyyyypppyyppk', 'kpppyyyppppyyppk', 'kppppyypppppyppk', 'kpppppppyyyppppk', 'kpppppppyyyypppk', '.kppppppyyyyppk.',
    '.kppppppppyyppk.', '..kppppppppppk..', '...kkppppppkk...', '.....kkkkkk.....'],
  tatica: [ // scroll with a circular arrow: the Tática command
    '................', '..kkkkkkkkkkkk..', '.knnnnnnnnnnnbk.', '..kkkkkkkkkkkk..', '...kyyyyyyyyk...', '...kyyggggyyk...',
    '...kygyyyygyk...', '...kygyyygggk...', '...kygyyyyoyk...', '...kygyyyyyyk...', '...kyyggggyyk...', '...kyyyyyyyyk...',
    '..kkkkkkkkkkkk..', '.knnnnnnnnnnnbk.', '..kkkkkkkkkkkk..', '................'],
  fogo: [ // flame: fire magic in a tactic summary
    '................', '.......kk.......', '......khk.......', '......khhk......', '.....khHhk..k...', '.....khHHhk.kk..',
    '....khHHHhkkhk..', '...khHHgHHhkhk..', '...khHgggHHhhk..', '..khHggtggHHhk..', '..khHgttttgHhk..', '..khHgttttgHhk..',
    '..khHggttggHhk..', '...khHggggHhk...', '....kkhhhhkk....', '......kkkk......'],
  cura: [ // heart: healing or reviving in a tactic summary
    '................', '...kkk....kkk...', '..kHHhk..kHhhk..', '.kHttHhkkHhhhhk.', '.kHtHhhhhhhhhhk.', '.kHHhhhhhhhhhDk.',
    '.khhhhhhhhhhhDk.', '..khhhhhhhhhDk..', '...khhhhhhhDk...', '....khhhhhDk....', '.....khhhDk.....', '......khDk......',
    '.......kk.......', '................', '................', '................'],
  pocao: recolor(POTION, { L: 'h', D: 'D' }),   // red potion
  eter: recolor(POTION, { L: 'p', D: 'B' }),    // blue ether
  elixir: recolor(POTION, { L: 'g', D: 'o' }),  // golden elixir
  pena: [ // phoenix-white feather, gold quill
    '............kk..', '..........kkttk.', '.........ktttPk.', '........kttttPk.', '.......kttttPk..', '......kttttPk...',
    '.....kttttPk....', '....kttttPk.....', '...ktPttPk......', '...kPttPk.......', '..kgkkk.........', '.kgk............',
    'kgk.............', 'kk..............', '................', '................'],
  estojo: [ // case of lockpicks
    '................', '................', '...kkkkkkkkkk...', '..knnnnnnnnnnk..', '..knrrrnnrrrnk..', '..knsrsnnsrsnk..',
    '..knnnnnnnnnnk..', '..kbbbbggbbbbk..', '..knnnnggnnnnk..', '..knnnnnnnnnnk..', '..knnnnnnnnnnk..', '..kbnnnnnnnnbk..',
    '...kbbbbbbbbk...', '....kkkkkkkk....', '................', '................'],
  carta: [ // sealed letter
    '................', '................', '..kkkkkkkkkkkk..', '.kyyyyyyyyyyyyk.', '.kymmmmmmmmmmyk.', '.kyyyyyyyyyyyyk.',
    '.kymmmmmmyyyyyk.', '.kyyyyyyyyDDyyk.', '.kymmmmyyDhhDyk.', '.kyyyyyyyDhhDyk.', '.kyyyyyyyyDDyyk.', '.kyyyyyyyyyyyyk.',
    '..kkkkkkkkkkkk..', '................', '................', '................'],
};
// Command words map to the same art (Técnica/Magia/Truque share the star)
const ICON_STATES = ['normal', 'sel', 'dis'];

const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function iconGrid(id, state = 'normal') {
  const g = ICON_ART[id];
  if (!g) throw new Error('unknown icon ' + id);
  if (state === 'normal') return g.slice();
  if (state === 'sel') { // gold halo on transparent pixels touching the drawing
    return g.map((row, y) => [...row].map((ch, x) => ch !== '.' ? ch
      : D4.some(([dx, dy]) => (g[y + dy] || '')[x + dx] && g[y + dy][x + dx] !== '.') ? 'g' : '.').join(''));
  }
  if (state === 'dis') { // two greys by brightness, outline kept
    return g.map(row => [...row].map(ch => ch === '.' || ch === 'k' ? ch : luma(UI_PAL[ch]) > 0.45 ? 'm' : 'x').join(''));
  }
  throw new Error('unknown state ' + state);
}
function luma(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

// Gold cursor 8×8 (menus) and bar tracks share the same palette
const CURSOR_GRID = ['kk......', 'kgk.....', 'kggk....', 'kgggk...', 'kggok...', 'kgok....', 'kok.....', 'kk......'];

// ---------- Browser: grids → canvas → data URL ----------
function gridCanvas(grid, scale = 1) {
  const cv = document.createElement('canvas');
  cv.width = grid[0].length * scale; cv.height = grid.length * scale;
  const c = cv.getContext('2d');
  grid.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { c.fillStyle = UI_PAL[ch]; c.fillRect(x * scale, y * scale, scale, scale); } }));
  return cv;
}
const URL_CACHE = {};
const gridUrl = (key, grid) => URL_CACHE[key] || (URL_CACHE[key] = gridCanvas(grid).toDataURL());
const frameUrl = (variant = 'base') => gridUrl('frame:' + variant, frameGrid(variant));
const iconUrl = (id, state = 'normal') => gridUrl(`icon:${id}:${state}`, iconGrid(id, state));

// Canvas windows (minimap, map): the same 9-slice, drawn 1:1 in canvas pixels
function drawFrame(c, x, y, w, h, variant = 'base') {
  const src = FRAME_CANVAS[variant] || (FRAME_CANVAS[variant] = gridCanvas(frameGrid(variant)));
  const S = FRAME_SLICE, sl = frameSlices();
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const cols = [[x, S], [x + S, w - 2 * S], [x + w - S, S]], rows = [[y, S], [y + S, h - 2 * S], [y + h - S, S]];
  const names = [['tl', 't', 'tr'], ['l', 'c', 'r'], ['bl', 'b', 'br']];
  rows.forEach(([dy, dh], j) => cols.forEach(([dx, dw], i) => {
    const p = sl[names[j][i]];
    if (dw > 0 && dh > 0) c.drawImage(src, p.x, p.y, p.w, p.h, dx, dy, dw, dh);
  }));
}
const FRAME_CANVAS = {};

// Publishes the frames as CSS variables (--frame, --frame-sel, ...) for border-image
function installFrames(root = document.documentElement) {
  for (const v of Object.keys(FRAME_VARIANTS)) root.style.setProperty(v === 'base' ? '--frame' : '--frame-' + v, `url(${frameUrl(v)})`);
  root.style.setProperty('--cursor', `url(${gridUrl('cursor', CURSOR_GRID)})`);
}

if (typeof document !== 'undefined') installFrames();
if (typeof module !== 'undefined') module.exports = { luma, UI_PAL, FRAME_GRID, FRAME_SLICE, FRAME_VARIANTS, frameGrid, frameSlices, ICON_ART, ICON_STATES, iconGrid, CURSOR_GRID, recolor };
