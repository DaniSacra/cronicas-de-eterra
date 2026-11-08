// ===== Field exploration: each hero's verb, objects that change the map =====
// Pure rules (no DOM, no G), like src/elos.js: what the party can do with the object ahead, where a pushed object
// goes, which water freezes, where a slide on ice stops, what the light of a lamp covers, what a horse sees, and what
// an area looks like again when the party comes back. The kinds and verbs come from FIELD_KINDS and FIELD_VERBS
// (src/data.js); an area lists its objects in A.field and town.js keeps their state in G.field[areaKey].

const FDIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up, right, down, left (the same order as TDIRS)

// The verb the party uses on this object now, or null (a lamp already lit, a chest already open). A pushable keeps
// its verb until its puzzle is solved and it becomes scenery
function fieldVerb(obj, kinds, verbs) {
  const k = kinds[obj.kind];
  if (!k || obj.done || obj.fixed) return null;
  const v = verbs[k.verb];
  return v ? { verb: k.verb, hero: v.hero, word: v.word, fx: v.fx } : null;
}
// The hint line: "Espaço: Lyra acende"
const fieldHint = (verb, heroName, key = 'Espaço') => `${key}: ${heroName} ${verb.word}`;

// Does this object stop the party? A done object that goes away (ice melted, icicles) does not
const fieldBlocks = (obj, kinds) => !!kinds[obj.kind] && kinds[obj.kind].block && !(obj.done && kinds[obj.kind].gone);

// One tile in the direction of the push, or null when that tile is taken (tree, cliff, water, ice, another object,
// a person): blocked(x, y) says so
function pushTarget(x, y, dir, blocked) {
  const [dx, dy] = FDIRS[dir], nx = x + dx, ny = y + dy;
  return blocked(nx, ny) ? null : { x: nx, y: ny };
}

// Gelo: the running water right ahead of the hero, up to n tiles in a row
function freezeAhead(x, y, dir, isWater, n = 2) {
  const [dx, dy] = FDIRS[dir], out = [];
  for (let i = 1; i <= n && isWater(x + dx * i, y + dy * i); i++) out.push([x + dx * i, y + dy * i]);
  return out;
}

// A step onto ice slides on until something stops it. kindAt(x, y) is 'ice', 'floor' (walkable, not ice) or
// 'block'. Returns the tiles crossed in order (empty when the first one is blocked); the last one is where it stops:
// on the ice before a rock or the edge, or on the first floor tile past the ice
function slidePath(x, y, dir, kindAt) {
  const [dx, dy] = FDIRS[dir], path = [];
  let cx = x, cy = y;
  for (let guard = 0; guard < 200; guard++) {
    const nx = cx + dx, ny = cy + dy, k = kindAt(nx, ny);
    if (k === 'block') break;
    path.push([nx, ny]); cx = nx; cy = ny;
    if (k === 'floor') break;
  }
  return path;
}

// Inside the light of a lit lamp or campfire: lights are [{ x, y, r }] in tiles
const litAt = (x, y, lights) => lights.some(l => (x - l.x) ** 2 + (y - l.y) ** 2 <= l.r * l.r);

// What a horse looking in dir sees: a fan that widens one tile on each side per tile ahead, up to range
function inCone(h, dir, p, range = 4) {
  const [dx, dy] = FDIRS[dir], rx = p.x - h.x, ry = p.y - h.y;
  const ahead = rx * dx + ry * dy, side = Math.abs(rx * dy - ry * dx);
  return ahead >= 1 && ahead <= range && side <= ahead;
}
// The tiles of that fan inside the map (for the lighter snow drawn on the ground)
function coneTiles(h, dir, range = 4) {
  const out = [];
  for (let y = h.y - range; y <= h.y + range; y++) for (let x = h.x - range; x <= h.x + range; x++) if (inCone(h, dir, { x, y }, range)) out.push([x, y]);
  return out;
}

// A perched crow stays on its dead pine and only dives at someone walking right beside it (diagonals count)
const perchedAttack = (r, party) => party.some(a => Math.max(Math.abs(a.x - r.x), Math.abs(a.y - r.y)) === 1);

// Where each object stands when the party walks in: a puzzle not solved yet starts over (nothing can stay stuck),
// a solved one keeps every object where the party left it. state: { s: { id: 1 } done, p: { id: [x, y] }, tiles:
// { 'x,y': tile } changed by the party (ice, a tied bridge), solved: { puzzle: 1 } }
function fieldPlace(defs, state) {
  return defs.map(d => {
    const keep = !d.puzzle || (state.solved && state.solved[d.puzzle]);
    const at = keep && state.p && state.p[d.id];
    return { id: d.id, x: at ? at[0] : d.x, y: at ? at[1] : d.y };
  });
}

// A fresh state for an area (old saves have none: every area starts as drawn)
const fieldState = (all, key) => (all[key] = all[key] || { s: {}, p: {}, tiles: {}, solved: {} });

// Where a loaded save stands: an area redrawn since that save (its map version changed) starts at its entry, with
// every flag kept; otherwise the saved spot
const savedSpot = (A, savedMapv, pos) => (A && A.mapv && savedMapv !== A.mapv ? A.start : pos);

if (typeof module !== 'undefined') module.exports = { FDIRS, fieldVerb, fieldHint, fieldBlocks, pushTarget, freezeAhead, slidePath, litAt, inCone, coneTiles, perchedAttack, fieldPlace, fieldState, savedSpot };
