// ===== Exploration in the open areas: field objects, ice, visible roamers, lit lamps, vistas =====
// The rules are pure and live in src/field.js (objects, pushes, ice, light) and src/vision.js (roamers). This is the
// side that touches G, TOWN and the screen. An area opts in with:
//   field: () => [{ id, kind, x, y, puzzle?, look? }]   objects (kinds in FIELD_KINDS, src/data.js)
//   puzzles: { name: objs => solved }                  a puzzle not solved starts over when the party comes back
//   freezable(x, y)                                    running water Lyra may freeze
//   onField(obj, verb)                                 what the place does after a verb (rewards, scenes)
//   roamers: () => [{ foe, ids, intro, x, y, range?, speed?, perch? }]   enemies seen on the map
//   vista: { north(c, w, h), south(c, w, h) }          a painted view past the edge of the map (panVista cuts to it)

const fieldDefs = A => (A && A.field ? A.field() : []);
const fieldNow = () => fieldState(G.field || (G.field = {}), areaKey(G.area));
const fieldGone = o => o.done && FIELD_KINDS[o.kind].gone;
// the topmost object of the tile (the ice block over its chest)
const fieldObjAt = (x, y) => (TOWN.objs || []).findLast(o => o.x === x && o.y === y && !fieldGone(o));
const fieldBlockAt = (x, y) => { const o = fieldObjAt(x, y); return !!o && fieldBlocks(o, FIELD_KINDS); };
// Lit lamps and fires: [{ x, y, r }] in tiles
const fieldLights = () => (TOWN.objs || []).filter(o => o.done && FIELD_KINDS[o.kind].light).map(o => ({ x: o.x, y: o.y, r: FIELD_KINDS[o.kind].light }));
const litTile = (x, y) => litAt(x, y, fieldLights());

// ---------- Entering an area: the map as the party left it ----------
function enterField() {
  const A = TOWN.A;
  TOWN.objs = []; TOWN.roamers = []; TOWN.fx = []; TOWN.hintKey = null; TOWN.vistaSide = null;
  if (A.field) {
    const st = fieldNow(), defs = fieldDefs(A), at = fieldPlace(defs, st);
    applyTiles(A, st.tiles);
    TOWN.objs = defs.map((d, i) => ({ ...newActor(at[i].x, at[i].y, 0), def: d, id: d.id, kind: d.kind, done: !!(st.s[d.id] || d.open), fixed: !!(d.puzzle && st.solved[d.puzzle]) }));
  }
  if (A.roamers) spawnRoamers();
}
// The tiles the party changed (ice, a tied bridge) on top of the area as drawn; the cached art is redrawn on a change
function applyTiles(A, tiles) {
  if (!A.g0) A.g0 = A.g.slice();
  const key = JSON.stringify(tiles || {});
  if (A.tilesKey === key) return;
  A.g.set(A.g0);
  for (const [k, t] of Object.entries(tiles || {})) { const [x, y] = k.split(',').map(Number); A.g[y * A.W + x] = t; }
  A.tilesKey = key; A.layer = null; A.light = null; A.edge = null;
}
function setTiles(list, t) {
  const st = fieldNow();
  for (const [x, y] of list) st.tiles[x + ',' + y] = t;
  applyTiles(TOWN.A, st.tiles);
  TOWN.A.layer = drawTownLayer(TOWN.A);
}

// ---------- Who does it ----------
const heroActor = id => { const i = G.party.findIndex(m => m.id === id); return i === 0 ? TOWN.p : i > 0 ? TOWN.followers[i - 1] : null; };
const dirTo = (a, x, y) => (Math.abs(x - a.x) >= Math.abs(y - a.y) ? (x > a.x ? 1 : 3) : (y > a.y ? 2 : 0));
const sideFree = (x, y) => TOWN.walkable(x, y) && !npcAt(x, y) && !partyAt(x, y) && !roamerAt(x, y);
// The hero of the verb steps beside the leader, does it and goes back to the line
async function heroStep(id, x, y, act) {
  const a = heroActor(id), P = TOWN.p;
  if (!a || a === P) { P.dir = dirTo(P, x, y); return act(); }
  const back = { x: a.x, y: a.y, dir: a.dir };
  const side = [(P.dir + 1) % 4, (P.dir + 3) % 4].map(d => ({ x: P.x + TDIRS[d][0], y: P.y + TDIRS[d][1] })).find(s => sideFree(s.x, s.y));
  if (side) { moveActor(a, side.x, side.y, 160); await wait(170); }
  a.dir = dirTo(a, x, y);
  await act();
  if (side) { moveActor(a, back.x, back.y, 160); await wait(170); }
  a.dir = back.dir;
}
// The lines of the first time a verb is used, once per save
async function firstTime(verb) {
  const f = FIELD_VERBS[verb] && FIELD_VERBS[verb].first;
  if (!f || G.seen['campo:' + verb]) return;
  G.seen['campo:' + verb] = 1;
  await play(f);
}

// ---------- The verbs ----------
const FX_SFX = { fire: 'fire', ice: 'ice', holy: 'holy', heal: 'heal', push: 'bump', step: 'select' };
function fieldFx(kind, x, y) { (TOWN.fx = TOWN.fx || []).push({ kind, x, y, t0: performance.now() }); const s = FX_SFX[kind]; if (s && Sfx[s]) Sfx[s](); }

async function fieldAct(o, v) {
  if (v.verb === 'empurra') return pushObj(o, TOWN.p.dir, true);
  const before = v.verb === 'atravessa';
  if (before) await firstTime(v.verb);
  await heroStep(v.hero, o.x, o.y, async () => { fieldFx(v.fx, o.x, o.y); await wait(500); });
  o.done = true; fieldNow().s[o.id] = 1;
  if (!before) await firstTime(v.verb);
  if (TOWN.A.onField) await TOWN.A.onField(o, v.verb);
  lookAround();
}

// Aldo pushes one tile in the direction he faces; nothing goes over water, ice, a cliff, a tree or another object
const PUSH_GROUND = () => new Set([TILE.GRASS, TILE.PATH, TILE.FLOWER, TILE.RUTS]);
function pushBlocked(x, y) {
  return !PUSH_GROUND().has(TOWN.tileAt(x, y)) || !!TOWN.buildingAt(x, y) || !!fieldObjAt(x, y) || !!npcAt(x, y) || partyAt(x, y) || !!roamerAt(x, y)
    || (TOWN.A.exits || []).some(e => e.x === x && e.y === y);
}
async function pushObj(o, dir, asked) {
  const v = fieldVerb(o, FIELD_KINDS, FIELD_VERBS);
  if (!v) return;
  const to = pushTarget(o.x, o.y, dir, pushBlocked);
  if (!to) { if (asked) await UI.say('Do outro lado não tem espaço.'); else Sfx.bump(); return; }
  await firstTime('empurra');
  TOWN.p.dir = dir;
  moveActor(o, to.x, to.y, 260); fieldFx('push', to.x, to.y);
  await wait(280);
  const st = fieldNow();
  st.p[o.id] = [o.x, o.y];
  const pz = o.def.puzzle, solved = pz && TOWN.A.puzzles && TOWN.A.puzzles[pz];
  if (pz && !st.solved[pz] && solved && solved(TOWN.objs)) {
    st.solved[pz] = 1;
    for (const q of TOWN.objs) if (q.def.puzzle === pz) { q.fixed = true; st.p[q.id] = [q.x, q.y]; }
  }
  if (TOWN.A.onField) await TOWN.A.onField(o, 'empurra');
}

// Gelo: Lyra freezes the running water ahead (two tiles), and the party can slide over it
const freezable = (x, y) => TOWN.tileAt(x, y) === TILE.WATER && !!TOWN.A.freezable && TOWN.A.freezable(x, y);
async function freezeWater() {
  const P = TOWN.p, tiles = freezeAhead(P.x, P.y, P.dir, freezable);
  if (!tiles.length) return;
  await heroStep('lyra', tiles[0][0], tiles[0][1], async () => { for (const [x, y] of tiles) fieldFx('ice', x, y); await wait(500); });
  setTiles(tiles, TILE.ICE);
  await firstTime('congela');
  if (TOWN.A.onField) await TOWN.A.onField({ kind: 'water', x: tiles[0][0], y: tiles[0][1] }, 'congela');
}

// What Espaço does facing this tile in a field area (null: nothing here)
function fieldAction(nx, ny) {
  const o = fieldObjAt(nx, ny);
  if (o) {
    const v = fieldVerb(o, FIELD_KINDS, FIELD_VERBS);
    if (v && inParty(v.hero)) return () => fieldAct(o, v);
    if (o.done && o.def.use) return () => o.def.use(o); // a lit campfire: rest again
    const look = typeof o.def.look === 'function' ? o.def.look(o) : o.def.look;
    if (look) return () => UI.say(look);
  }
  if (freezable(nx, ny) && inParty('lyra')) return freezeWater;
  return null;
}
// The hint line for the object ahead ("Espaço: Lyra acende"), once each time the party turns to it
function fieldHintCheck() {
  if (!TOWN.A.field) return;
  const P = TOWN.p, nx = P.x + TDIRS[P.dir][0], ny = P.y + TDIRS[P.dir][1], o = fieldObjAt(nx, ny);
  let v = o && fieldVerb(o, FIELD_KINDS, FIELD_VERBS);
  if (!v && freezable(nx, ny)) v = FIELD_VERBS.congela;
  if (v && !inParty(v.hero)) v = null;
  const text = v ? fieldHint(v, heroName(v.hero), typeof TOUCH !== 'undefined' && TOUCH ? 'OK' : 'Espaço') : null;
  if (text && text !== TOWN.hintKey) UI.info(text);
  TOWN.hintKey = text;
}

// ---------- Ice ----------
function slideKind(x, y) {
  if (!TOWN.walkable(x, y) || npcAt(x, y) || roamerAt(x, y)) return 'block';
  return TOWN.tileAt(x, y) === TILE.ICE ? 'ice' : 'floor';
}
async function slideParty(d) {
  const P = TOWN.p, path = slidePath(P.x, P.y, d, slideKind);
  if (!path.length) { Sfx.bump(); return; }
  P.dir = d;
  if (TOWN.A.onSlide) await TOWN.A.onSlide();
  for (const [x, y] of path) { stepParty(x, y, 90); await wait(95); }
  TOWN.moved = true;
}

// ---------- Visible roamers ----------
const roamerAt = (x, y) => (TOWN.roamers || []).find(r => r.x === x && r.y === y);
const roamFree = (x, y) => TOWN.walkable(x, y) && TOWN.tileAt(x, y) !== TILE.ICE && !npcAt(x, y) && !roamerAt(x, y) && !partyAt(x, y)
  && !(TOWN.A.reserved && TOWN.A.reserved(x, y));
function spawnRoamers() { // born again each time the party walks in
  TOWN.roamers = TOWN.A.roamers().map(d => ({ ...newActor(d.x, d.y, 2), def: d, home: { x: d.x, y: d.y }, range: d.range ?? 2, perch: !!d.perch, wait: rnd(600, 1800), calm: 0 }));
}
// The roamer saw the party: true only on the step it starts to chase (the alert sounds once, again after it loses them)
const spotted = (r, chase) => { const now = chase && !r.seen; r.seen = chase; return now; };
const touchingParty = r => r.perch ? perchedAttack(r, [TOWN.p, ...TOWN.followers])
  : [TOWN.p, ...TOWN.followers].some(a => Math.abs(a.x - r.x) + Math.abs(a.y - r.y) === 1);
function updateRoamers(dt) {
  const radius = TOWN.A.vision ? TOWN.A.vision.radius : 6;
  for (const r of TOWN.roamers || []) {
    if (r.calm > 0) r.calm -= dt;
    if (r.t < 1 || (r.wait -= dt) > 0) continue;
    const { to, chase } = roamerStep(r, TOWN.p, radius, roamFree, Math.random, litTile);
    r.wait = chase ? (to ? 0 : 300) : rnd(900, 2400);
    if (spotted(r, chase)) Sfx.alert();
    if (!to || !roamFree(to.x, to.y)) continue; // the next step is the party itself: contact starts the fight
    r.dir = to.x > r.x ? 1 : to.x < r.x ? 3 : to.y > r.y ? 2 : 0;
    moveActor(r, to.x, to.y, r.def.speed || 260);
  }
}
// A roamer touching the party (the party standing still between steps) starts its fight
const roamerTouching = () => (TOWN.roamers || []).find(r => r.t >= 1 && !(r.calm > 0) && touchingParty(r));
async function roamerFight(r) {
  const res = await startBattle(r.def.ids, false, { intro: r.def.intro });
  if (res === 'lose') return gameOver();
  backToArea();
  if (res === 'win') TOWN.roamers = TOWN.roamers.filter(o => o !== r);
  else { // the party ran: it backs off and walks again a little later
    const s = r.perch ? r : retreatSpot(r, TOWN.p, roamFree);
    Object.assign(r, { x: s.x, y: s.y, fx: s.x, fy: s.y, t: 1, calm: 3000, wait: 600 });
  }
  if (TOWN.A.afterFight) await TOWN.A.afterFight(res); // the pasture: the noise scares the horses close by
}

// ---------- Vistas: a cut to a painted view past the edge of the map, held while the narration plays ----------
// (fadeTo is the screen curtain of src/main.js; vistaBack() cuts back to the party)
async function panVista(side) {
  if (!TOWN.A.vista || !TOWN.A.vista[side]) return;
  await fadeTo(1, 400);
  TOWN.vistaSide = side;
  await fadeTo(0, 400);
}
async function vistaBack() {
  if (!TOWN.vistaSide) return;
  await fadeTo(1, 400);
  TOWN.vistaSide = null;
  await fadeTo(0, 400);
}
// The painted view, cached by size
function vistaCanvas(A, side, w, h) {
  A.vistaCv = A.vistaCv || {};
  const key = side + w + 'x' + h;
  if (!A.vistaCv[key]) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; A.vista[side](cv.getContext('2d'), w, h); A.vistaCv[key] = cv; }
  return A.vistaCv[key];
}

// ---------- Drawing ----------
// Short pixel bursts at map scale, in the colors of the battle spells
const FX_COLORS = { fire: ['#f0d860', '#e8b840', '#c89c38', '#a8323e'], ice: ['#e8eff8', '#8ac0f0', '#cbd8ec'], holy: ['#fff6c0', '#f0d860', '#e8b840'],
  heal: ['#90e0b0', '#4ad08a', '#fff6c0'], push: ['#e8eff8', '#cbd8ec', '#a4b8da'], step: ['#e8eff8'] };
function drawFieldFx(c, now, camX, camY) {
  TOWN.fx = (TOWN.fx || []).filter(f => now - f.t0 < 600);
  for (const f of TOWN.fx) {
    const k = (now - f.t0) / 600, cols = FX_COLORS[f.kind] || FX_COLORS.step, X = f.x * TS - camX, Y = f.y * TS - camY;
    for (let i = 0; i < 10; i++) {
      const h = TownArt.hash(i, f.t0 | 0, 7), h2 = TownArt.hash(i, f.t0 | 0, 9);
      const rise = f.kind === 'push' ? -4 * k : f.kind === 'ice' ? 0 : -14 * k;
      const px = Math.round(X + 2 + h * 12 + (f.kind === 'push' ? (h - 0.5) * 10 * k : 0)), py = Math.round(Y + 4 + h2 * 10 + rise);
      if ((i + Math.floor(k * 6)) % 3 === 0 && f.kind === 'ice') continue; // ice glints on and off
      c.fillStyle = cols[i % cols.length];
      c.fillRect(px, py, f.kind === 'holy' && i < 3 ? 1 : 2, f.kind === 'holy' && i < 3 ? 6 : 2);
    }
  }
}
// The warm pool of each lit lamp or fire, in whole steps (drawn over the dusk veil)
function drawFieldLights(c, camX, camY) {
  for (const l of fieldLights()) {
    const cx = l.x * TS + TS / 2 - camX, cy = l.y * TS + TS / 2 - camY;
    for (const g of TownArt.lightRings(l.r * TS)) if (g.warm) {
      c.fillStyle = `rgba(232,184,64,${(g.warm * 0.7).toFixed(3)})`;
      TownArt.disc(c, Math.round(cx), Math.round(cy), g.r);
    }
  }
  // what gives the light is drawn again over its own pool, so the lamp keeps its colors (as in Valmor's light layer)
  const now = performance.now();
  for (const o of TOWN.objs || []) if (o.done && FIELD_KINDS[o.kind].light) {
    const spr = TownArt.fieldSprite(o.kind, true, now, o), p = actorPos(o);
    c.drawImage(spr, Math.round(p.x - camX + (TS - spr.width) / 2), Math.round(p.y - camY - (spr.height - TS)));
  }
}
