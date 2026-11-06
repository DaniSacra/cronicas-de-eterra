// ===== Geração dos andares (determinística por semente) =====

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// grid: 1 = parede, 0 = chão, 2 = escada
function generateFloor(fi) {
  const def = FLOORS[fi];
  const rng = mulberry32(def.seed);
  const N = def.size;
  const g = new Uint8Array(N * N).fill(1);
  const id = (x, y) => y * N + x;

  // Labirinto (backtracker recursivo)
  const stack = [[1, 1]];
  g[id(1, 1)] = 0;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const opts = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([dx, dy]) => {
      const nx = cx + dx, ny = cy + dy;
      return nx > 0 && ny > 0 && nx < N - 1 && ny < N - 1 && g[id(nx, ny)] === 1;
    });
    if (!opts.length) { stack.pop(); continue; }
    const [dx, dy] = opts[Math.floor(rng() * opts.length)];
    g[id(cx + dx / 2, cy + dy / 2)] = 0;
    g[id(cx + dx, cy + dy)] = 0;
    stack.push([cx + dx, cy + dy]);
  }

  // Salas
  for (let r = 0; r < def.rooms; r++) {
    const rw = rng() < 0.5 ? 3 : 5, rh = rng() < 0.5 ? 3 : 5;
    const cntX = Math.floor((N - 1 - rw - 1) / 2) + 1, cntY = Math.floor((N - 1 - rh - 1) / 2) + 1;
    const rx = 1 + 2 * Math.floor(rng() * cntX), ry = 1 + 2 * Math.floor(rng() * cntY);
    if (rx <= 2 && ry <= 2) continue; // não cobrir o início
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) g[id(x, y)] = 0;
  }

  // Laços (remove algumas paredes para criar caminhos alternativos)
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    if (g[id(x, y)] !== 1) continue;
    const h = g[id(x - 1, y)] === 0 && g[id(x + 1, y)] === 0 && g[id(x, y - 1)] === 1 && g[id(x, y + 1)] === 1;
    const v = g[id(x, y - 1)] === 0 && g[id(x, y + 1)] === 0 && g[id(x - 1, y)] === 1 && g[id(x + 1, y)] === 1;
    if ((h || v) && rng() < def.loops) g[id(x, y)] = 0;
  }

  // Nichos: garante becos suficientes para escada/chefe, fonte e baús
  const isDeadEnd = (x, y) => g[id(x, y)] === 0 && !(x === 1 && y === 1) &&
    [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => g[id(x + dx, y + dy)] !== 1).length === 1;
  const need = def.loot.length + 2;
  let count = 0;
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) if (isDeadEnd(x, y)) count++;
  for (let tries = 0; count < need && tries < 2000; tries++) {
    const x = 1 + Math.floor(rng() * (N - 2)), y = 1 + Math.floor(rng() * (N - 2));
    if (g[id(x, y)] !== 1) continue;
    const fn = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => g[id(x + dx, y + dy)] === 0);
    if (fn.length !== 1) continue;
    const [dx, dy] = fn[0];
    const px = x + dx, py = y + dy;
    const wasEnd = isDeadEnd(px, py);
    g[id(x, y)] = 0;
    count += 1 - (wasEnd ? 1 : 0);
  }

  // Distâncias (BFS) a partir do início
  const dist = new Int32Array(N * N).fill(-1);
  const q = [id(1, 1)]; dist[id(1, 1)] = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi], cx = c % N, cy = (c / N) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = id(cx + dx, cy + dy);
      if (g[n] === 0 && dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); }
    }
  }
  const neighbors = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => g[id(x + dx, y + dy)] !== 1).length;

  let ends = [];
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    if (g[id(x, y)] === 0 && !(x === 1 && y === 1) && neighbors(x, y) === 1 && dist[id(x, y)] > 0) ends.push({ x, y, d: dist[id(x, y)] });
  }
  ends.sort((a, b) => b.d - a.d);
  const maxD = ends.length ? ends[0].d : 1;

  const objects = [];
  let stairs = null;
  const goal = ends.shift();
  if (def.boss) objects.push({ type: 'boss', x: goal.x, y: goal.y });
  else { g[id(goal.x, goal.y)] = 2; stairs = { x: goal.x, y: goal.y }; }

  // Fonte
  if (ends.length) {
    let best = 0, bd = 1e9;
    ends.forEach((e, i) => { const dd = Math.abs(e.d - maxD * def.fountainAt); if (dd < bd) { bd = dd; best = i; } });
    const f = ends.splice(best, 1)[0];
    objects.push({ type: 'fountain', x: f.x, y: f.y });
  }

  // Baús
  for (let i = ends.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ends[i], ends[j]] = [ends[j], ends[i]]; }
  def.loot.forEach((loot, i) => {
    if (ends[i]) objects.push({ type: 'chest', x: ends[i].x, y: ends[i].y, loot });
  });

  // Variação das paredes: 0 normal, 1 musgo/rachada, 2 tocha, 3 ossário, 4/5 túnel cavado (com ferramentas),
  // 6 velas num ressalto, 7 cogumelos que brilham. O sorteio é o mesmo de sempre: o mapa não muda.
  // Com def.tunnels, o caminho alterna cripta antiga e túnel cavado pela distância desde a escada:
  // as faixas [início, fim) de def.tunnels (frações da maior distância) são túnel.
  const wallVar = new Uint8Array(N * N);
  const inTunnel = d => (def.tunnels || []).some(([a, b]) => d >= a * maxD && d < b * maxD);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (g[id(x, y)] !== 1) continue;
    const r = rng();
    let open = false, near = 1e9;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < N && ny < N && g[id(nx, ny)] !== 1) { open = true; if (dist[id(nx, ny)] >= 0) near = Math.min(near, dist[id(nx, ny)]); }
    }
    if (open && near < 1e9 && inTunnel(near)) wallVar[id(x, y)] = r < 0.12 ? 5 : 4;
    else if (open && r < 0.09) wallVar[id(x, y)] = 2;
    else if (r < 0.15) wallVar[id(x, y)] = 3; // nicho de ossário
    else if (r < 0.24) wallVar[id(x, y)] = 1;
    else if (open && r < 0.31) wallVar[id(x, y)] = 6;
    else if (open && r < 0.38) wallVar[id(x, y)] = 7;
  }

  // Direção inicial: primeira aberta
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  let startDir = DIRS.findIndex(([dx, dy]) => g[id(1 + dx, 1 + dy)] !== 1);
  if (startDir < 0) startDir = 1;

  return { size: N, grid: g, objects, stairs, wallVar, start: { x: 1, y: 1, dir: startDir }, dist };
}

if (typeof module !== 'undefined') module.exports = { generateFloor, mulberry32 };
