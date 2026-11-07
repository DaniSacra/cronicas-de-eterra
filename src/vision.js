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

if (typeof module !== 'undefined') module.exports = { SIGHT, areaKey, seenTiles, inSight, markSight, tileSight, packExplored, unpackExplored };
