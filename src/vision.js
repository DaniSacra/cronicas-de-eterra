// ===== Visão e névoa nas áreas vistas de cima =====
// Uma área com vision: { radius } só mostra o que está perto do grupo. Cada tile fica num de três estados:
// nunca visto (preto), já visto fora do raio (névoa) e dentro do raio (normal). Os tiles vistos ficam em
// G.explored, ao lado dos andares da cripta, com a chave 'area:<id>', e vão no save do mesmo jeito.

const SIGHT = { DARK: 0, FOG: 1, LIT: 2 };
const areaKey = id => 'area:' + id;

// Tiles vistos de uma área (um save antigo sem esse dado começa com a área toda no escuro)
function seenTiles(explored, key, size) {
  if (!explored[key] || explored[key].length !== size) explored[key] = new Uint8Array(size);
  return explored[key];
}
const inSight = (x, y, px, py, r) => (x - px) ** 2 + (y - py) ** 2 <= r * r;
function markSight(seen, W, H, px, py, r) {
  for (let y = Math.max(0, Math.floor(py - r)); y <= Math.min(H - 1, Math.ceil(py + r)); y++)
    for (let x = Math.max(0, Math.floor(px - r)); x <= Math.min(W - 1, Math.ceil(px + r)); x++)
      if (inSight(x, y, px, py, r)) seen[y * W + x] = 1;
}
function tileSight(seen, W, x, y, px, py, r) {
  if (inSight(x, y, px, py, r)) return SIGHT.LIT;
  return seen[y * W + x] ? SIGHT.FOG : SIGHT.DARK;
}

// Save: os Uint8Array viram listas e voltam (andares da cripta e áreas usam o mesmo caminho)
const packExplored = ex => Object.fromEntries(Object.entries(ex).map(([k, v]) => [k, Array.from(v)]));
const unpackExplored = s => Object.fromEntries(Object.entries(s || {}).map(([k, v]) => [k, Uint8Array.from(v)]));

// ---------- Visible roamers (areas with roamers: the southern road and the pasture) ----------
// They walk near where they were born, come after the party once they see it and fight on contact. Light is a
// refuge: a roamer never steps into the light of a lit lamp or campfire and gives up the chase while the party
// stands in it (lit(x, y) says where the light is)
const STEPS4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// First step of a shortest path to the target, around obstacles (breadth first). free(x, y) says if a tile is free;
// the target's tile counts as free. null when there is no way
function pathStep(from, to, free, limit = 600) {
  const k = (x, y) => x + ',' + y, start = k(from.x, from.y), prev = new Map([[start, null]]), q = [[from.x, from.y]];
  for (let i = 0; i < q.length && i < limit; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of STEPS4) {
      const nx = x + dx, ny = y + dy, nk = k(nx, ny);
      if (prev.has(nk)) continue;
      const goal = nx === to.x && ny === to.y;
      if (!goal && !free(nx, ny)) continue;
      prev.set(nk, k(x, y));
      if (goal) {
        let c = nk;
        while (prev.get(c) !== start) c = prev.get(c);
        const [sx, sy] = c.split(',').map(Number);
        return { x: sx, y: sy };
      }
      q.push([nx, ny]);
    }
  }
  return null;
}

// What the roamer does now: { to, chase }. It chases when it sees the party (in the radius, not calmed after a
// flight, the party out of the light); otherwise it wanders around home. A perched one (a crow) never moves
function roamerStep(r, target, radius, free, rand = Math.random, lit = () => false) {
  if (r.perch) return { to: null, chase: false };
  const ok = (x, y) => free(x, y) && !lit(x, y);
  if (!(r.calm > 0) && !lit(target.x, target.y) && inSight(r.x, r.y, target.x, target.y, radius)) return { to: pathStep(r, target, ok), chase: true };
  const [dx, dy] = STEPS4[Math.floor(rand() * 4)], nx = r.x + dx, ny = r.y + dy;
  const near = Math.abs(nx - r.home.x) <= r.range && Math.abs(ny - r.home.y) <= r.range && ok(nx, ny);
  return { to: near ? { x: nx, y: ny } : null, chase: false };
}

// After the party runs away, the roamer backs off: the farthest tile from the party a few steps away
function retreatSpot(r, from, free, steps = 4) {
  let best = { x: r.x, y: r.y }, bd = -1;
  const seen = new Set([r.x + ',' + r.y]);
  let ring = [[r.x, r.y]];
  for (let s = 0; s < steps; s++) {
    const next = [];
    for (const [x, y] of ring) for (const [dx, dy] of STEPS4) {
      const nx = x + dx, ny = y + dy, nk = nx + ',' + ny;
      if (seen.has(nk) || !free(nx, ny)) continue;
      seen.add(nk); next.push([nx, ny]);
      const d = (nx - from.x) ** 2 + (ny - from.y) ** 2;
      if (d > bd) { bd = d; best = { x: nx, y: ny }; }
    }
    ring = next;
  }
  return best;
}

if (typeof module !== 'undefined') module.exports = { SIGHT, areaKey, seenTiles, inSight, markSight, tileSight, packExplored, unpackExplored, pathStep, roamerStep, retreatSpot };
