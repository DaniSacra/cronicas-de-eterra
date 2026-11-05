// ===== Mapa de Eterra: o mapa-múndi do jogo, com pontos de interesse =====
// Coordenadas 0–1000 × 0–700, as mesmas do artefato "Mapa de Eterra" (onde o Daniel anota a história).
// Um ponto só aparece quando o grupo já ouviu falar dele: o mapa cresce junto com a história.
// Para pôr um lugar novo: acrescente um item em WORLD_POIS com show() e text().

const WORLD_REINOS = {
  Imladrin: { x: 215, y: 345, text: () => 'A ilha do oeste: alta e estreita, de norte a sul. O sul é frio; o norte, ameno e farto.\nO reino mais desenvolvido de Eterra, de fábricas e engenhos a vapor, e o único governado por uma rainha, que mora no norte.' },
  Formeth:  { x: 485, y: 290, text: () => 'O norte da ilha do meio: uma floresta sem fim, terra dos elfos.\nHá magia por todo lado, e seus clãs conquistaram as próprias terras com ela.' },
  Hyarmeth: { x: 545, y: 455, text: () => 'O sul da ilha do meio. Muito frio, e seu povo nasceu acostumado com isso.\nGente forte, com fama de brava e destemida em batalha.' },
  Sindarin: { x: 860, y: 320, text: () => 'A ilha do leste, a menor. Muito quente, de savanas e desertos.\nTerra de muitas tribos, sempre em guerra umas com as outras. Nos outros reinos dizem que nada de bom vem do leste.' },
};

// visto: o grupo já esteve lá (ou está). Sem visto(), o lugar é só um nome ouvido por aí.
const WORLD_POIS = [
  { id: 'valmor', nome: 'Valmor', reino: 'Imladrin', tipo: 'Vila', x: 200, y: 572, show: () => true, visto: () => true,
    text: () => 'Vila do sul gelado de Imladrin, na estrada que sobe para o norte. Uma capela, a casa do ancião e a Taverna Poney Saltitante.\n' +
      (G.bossDead ? 'Os mortos voltaram a dormir. A estrada para Erukh está aberta.'
        : G.intro ? 'Um mensageiro do Templo caiu ferido na taverna. Encapuzados queriam a carta que ele trazia.'
        : G.seen.job ? 'Alguém, ou alguma coisa, anda abrindo as covas do cemitério.'
        : `${heroName('aldo')} acabou de chegar, procurando pouso para o inverno.`) },
  { id: 'cemiterio', nome: 'Cemitério de Valmor', reino: 'Imladrin', tipo: 'Cemitério', x: 160, y: 610, show: () => G.seen.job, visto: () => G.seen.cemEntrou,
    text: () => 'Atrás da capela, no alto da vila.\n' +
      (G.seen.covas ? 'Algumas covas foram cavadas de fora, com pá. Outras foram abertas por dentro.'
        : 'A Berta troca o quarto por um favor: ver as covas abertas.') },
  { id: 'cripta', nome: 'Cripta de Valmor', reino: 'Imladrin', tipo: 'Masmorra', x: 240, y: 608, show: () => G.quest || G.reached, visto: () => G.reached,
    text: () => 'Paladinos fecharam esta cripta há muito tempo, na guerra de Elun. Algo dorme lá embaixo.\n' +
      (G.bossDead ? 'Morvath virou pó. Antes, disse que não foi ele quem abriu o selo.'
        : G.seen.altar ? 'No altar, escreveram "O rei voltará".'
        : G.seen.lapide ? 'Uma lápide diz o nome do rei: Morvath. Ele traiu a luz.'
        : 'O ancião quer um grupo de quatro para descer.') },
  { id: 'templo', nome: 'Templo de Erukh', reino: 'Hyarmeth', tipo: 'Templo', x: 425, y: 480, show: () => true, visto: () => false,
    text: () => 'O templo mais conhecido de Hyarmeth, do outro lado do mar. Famílias deixam ali os filhos para serem treinados como guerreiros de Yah.' +
      (G.intro ? '\nDe lá veio o mensageiro ferido, com uma carta do sumo sacerdote Shulkhan.' : '') },
  { id: 'erukh', nome: 'Erukh', reino: 'Imladrin', tipo: 'Capital', x: 215, y: 125, show: () => true, visto: () => false,
    text: () => 'Capital de Imladrin, no norte da ilha: monumentos, arte e máquinas a vapor. Cidade da rainha Lara e sede da Ordem de Erukh.' +
      (G.bossDead ? '\nO próximo destino. Tobias pediu: não confiar em ninguém antes da rainha.'
        : G.intro ? '\nA carta lacrada precisa chegar às mãos da rainha.' : '') },
  { id: 'purpura', nome: 'Floresta Púrpura', reino: 'Imladrin', tipo: 'Floresta', x: 245, y: 395, show: () => true, visto: () => false,
    text: () => 'Uma floresta mágica. Os viajantes contam que é protegida pela Liga Branca.' },
  { id: 'lago', nome: 'Lago dos Ventos Uivantes', reino: 'Hyarmeth', tipo: 'Lago', x: 590, y: 400, show: () => true, visto: () => false,
    text: () => 'Um lago gelado no meio de Hyarmeth. Quem passa por lá não esquece o barulho do vento.' },
  { id: 'lothriel', nome: 'Lothriel', reino: 'Formeth', tipo: 'Cidade', x: 560, y: 225, show: () => true, visto: () => false,
    text: () => 'Cidade de Formeth num vale de árvores. As casas de madeira ficam tão juntas dos troncos que parecem crescer com eles.' },
  { id: 'gloerin', nome: 'Floresta Glóerin', reino: 'Formeth', tipo: 'Floresta', x: 450, y: 215, show: () => true, visto: () => false,
    text: () => 'Dizem que ali vive a maioria dos elfos da floresta.' },
  { id: 'ahk', nome: 'Monastério de Ahk', reino: 'Sindarin', tipo: 'Templo', x: 830, y: 370, show: () => true, visto: () => false,
    text: () => 'Monges de Sindarin guardam ali papiros muito antigos.' },
  { id: 'sufuri', nome: 'Deserto Súfuri', reino: 'Sindarin', tipo: 'Deserto', x: 890, y: 445, show: () => true, visto: () => false,
    text: () => 'Areia e calor sem fim, no leste de Sindarin.' },
];

const WorldMap = (() => {
  const W = 250, H = 175, K = 4; // 1 pixel do mapa = 4 unidades do mundo
  // Três ilhas: Imladrin (oeste, alta e estreita), a ilha do meio (Formeth ao norte, Hyarmeth ao sul) e Sindarin (leste, a menor)
  const COAST = ['M150,70 C200,40 280,50 300,90 C330,150 300,210 315,270 C335,340 300,400 320,470 C340,540 300,610 250,640 C200,665 140,650 120,600 C100,540 135,480 115,410 C95,340 130,280 110,210 C95,150 110,95 150,70 Z',
    'M420,80 C480,50 600,55 660,85 C700,110 690,170 680,220 C670,280 700,330 685,390 C670,450 700,520 670,580 C640,640 560,655 490,640 C420,625 385,580 395,520 C405,460 375,400 390,340 C400,280 380,220 395,160 C400,120 395,95 420,80 Z',
    'M800,215 C850,195 920,205 940,250 C960,300 950,360 945,410 C940,470 920,530 870,540 C820,550 775,515 770,465 C765,420 785,380 775,330 C765,280 765,235 800,215 Z'];
  const ISLES = ['M35,640 c15,-22 55,-18 60,4 c-8,22 -50,26 -60,-4z', 'M960,600 c10,-14 34,-8 34,6 c-4,14 -30,18 -34,-6z'];
  const LAKE = { x: 590, y: 400, rx: 30, ry: 16 };
  const REG = {
    Imladrin: [[0, 0], [350, 0], [350, 700], [0, 700]],
    Sindarin: [[730, 0], [1000, 0], [1000, 700], [730, 700]],
    Formeth: [[350, 0], [730, 0], [730, 320], [610, 345], [500, 330], [350, 350]],
    Hyarmeth: [[350, 350], [500, 330], [610, 345], [730, 320], [730, 700], [350, 700]],
  };
  const PAL = {
    sea: '#1a3f7c', wave: '#3a6ab0', shallow: '#2a5aa0', ink: '#0a1230', lake: '#2a5aa0',
    Formeth: ['#3f7a3a', '#4e8a40', '#336a32'], Imladrin: ['#8aa04a', '#9cb055', '#76903e'],
    Sindarin: ['#d6ad5c', '#e4c070', '#bf9448'], Hyarmeth: ['#7e9a86', '#8faa94', '#6c8a76'], tundra: ['#a9b8b8', '#bccaca', '#93a4a6'],
    snow: ['#dfe8ee', '#eef3f6', '#c4d2e0'], border: '#2a1a10',
  };

  function inPoly(pts, x, y) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  function noise(x, y, g) {
    const fx = x / g, fy = y / g, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function rng(s) { return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  let mapCanvas = null;
  function paint() {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    // terra = dentro da costa ou das ilhas (testado no centro de cada pixel)
    const coast = COAST.map(d => new Path2D(d)), isles = ISLES.map(d => new Path2D(d));
    const land = new Uint8Array(W * H), water = new Uint8Array(W * H);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const X = px * K + 2, Y = py * K + 2;
      const jx = X + (noise(px, py, 7) - 0.5) * 44, jy = Y + (noise(px + 99, py + 99, 7) - 0.5) * 44; // costa recortada
      const onLand = coast.some(p => c.isPointInPath(p, jx, jy)) || isles.some(p => c.isPointInPath(p, X, Y));
      const lake = ((X - LAKE.x) / LAKE.rx) ** 2 + ((Y - LAKE.y) / LAKE.ry) ** 2 < 1;
      land[py * W + px] = onLand && !lake ? 1 : 0;
      water[py * W + px] = onLand && lake ? 1 : 0;
    }
    const L = (x, y) => x >= 0 && y >= 0 && x < W && y < H && land[y * W + x];
    const img = c.createImageData(W, H);
    const put = (px, py, hex) => { const i = (py * W + px) * 4, n = parseInt(hex.slice(1), 16); img.data[i] = n >> 16; img.data[i + 1] = (n >> 8) & 255; img.data[i + 2] = n & 255; img.data[i + 3] = 255; };
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const X = px * K + 2, Y = py * K + 2;
      if (land[py * W + px]) {
        const reg = Object.keys(REG).find(k => inPoly(REG[k], X, Y)) || 'Hyarmeth';
        let pal = PAL[reg];
        const cold = Y + noise(px, py, 6) * 60; // o sul das duas ilhas grandes é gelado; Hyarmeth inteiro é frio
        if (reg === 'Hyarmeth') pal = cold > 590 ? PAL.snow : cold > 470 ? PAL.tundra : pal;
        if (reg === 'Imladrin' && cold > 600) pal = PAL.snow;
        const n = noise(px, py, 5) * 0.7 + hash(px, py) * 0.3;
        put(px, py, n > 0.62 ? pal[1] : n < 0.3 ? pal[2] : pal[0]);
        continue;
      }
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => L(px + dx, py + dy));
      const near2 = !near && [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dy]) => L(px + dx, py + dy));
      if (near) put(px, py, PAL.ink);
      else if (water[py * W + px] || near2) put(px, py, PAL.shallow);
      else put(px, py, (py % 7 === 3 && hash(Math.floor(px / 3), py) < 0.08) ? PAL.wave : PAL.sea);
    }
    c.putImageData(img, 0, 0);

    // fronteiras pontilhadas, só em terra
    c.fillStyle = PAL.border;
    for (const k of ['Formeth']) { // a única fronteira em terra: Formeth × Hyarmeth
      const pts = REG[k];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0) / K;
        for (let s = 0; s < len; s++) {
          const px = Math.round((x0 + (x1 - x0) * s / len) / K), py = Math.round((y0 + (y1 - y0) * s / len) / K);
          if (s % 4 < 2 && L(px, py)) c.fillRect(px, py, 1, 1);
        }
      }
    }
    // relevo: mesma semente do artefato, para os dois mapas baterem
    const spr = (rows, cols, px, py) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (cols[ch] && L(px + x, py + y)) { c.fillStyle = cols[ch]; c.fillRect(px + x, py + y, 1, 1); }
    }));
    const MTN = ['...w...', '..wwm..', '.mmmmd.', 'mmmmddd', 'mmmdddd'];
    const MTNC = { w: '#f0f4f8', m: '#8a7a68', d: '#5a4a3a' };
    const TREE = ['.g.', 'ggG', 'gGG', '.t.'];
    const TREEC = { g: '#2e6a2a', G: '#1e461e', t: '#4a3020' };
    const PINE = ['.w.', 'wgw', 'gGg', '.t.'];
    const PINEC = { w: '#eef3f6', g: '#2e5a3a', G: '#1e3a28', t: '#4a3020' };
    const DUNE = ['.ddd.', 'd...d'];
    const CHIMNEY = ['.ss.', 's...', 'c...', 'c.hh', 'chhh'];
    const CHIMC = { s: '#c8ccd4', c: '#8a4a32', h: '#5a5a6a' };
    const SPARK = ['.m.', 'mMm', '.m.'];
    const r = rng(42);
    const mtn = (x, y) => spr(MTN, MTNC, Math.round(x / K) - 3, Math.round(y / K) - 4);
    const at = (rows, cols, n, x0, w, y0, h, rr = r) => { for (let i = 0; i < n; i++) spr(rows, cols, Math.round((x0 + rr() * w) / K), Math.round((y0 + rr() * h) / K)); };
    for (let i = 0; i < 14; i++) { const x = 480 + r() * 180, y = 85 + r() * 40; r(); mtn(x, y); }   // montanhas do norte de Formeth
    for (let i = 0; i < 8; i++) { const x = 785 + r() * 70, y = 230 + r() * 40; r(); mtn(x, y); }    // Montanhas de Súfuri
    for (let i = 0; i < 6; i++) { const x = 140 + r() * 140, y = 470 + r() * 50; r(); mtn(x, y); }   // serra no meio de Imladrin
    at(TREE, TREEC, 90, 395, 290, 130, 200);                                            // a grande floresta de Formeth
    at(SPARK, { m: '#7fe0d0', M: '#e0fff8' }, 14, 400, 270, 140, 180);                  // magia por todo lado
    at(TREE, { g: '#7a3a8a', G: '#4e2260', t: '#3a2030' }, 18, 220, 50, 375, 40);       // Floresta Púrpura
    at(TREE, TREEC, 14, 130, 170, 160, 160);                                            // o norte ameno de Imladrin
    at(CHIMNEY, CHIMC, 7, 160, 120, 95, 120);                                           // engenhos a vapor perto de Erukh
    at(DUNE, { d: '#a87c38' }, 24, 790, 140, 330, 180);                                 // desertos de Sindarin
    const r2 = rng(7);
    at(PINE, PINEC, 30, 400, 270, 360, 260, r2);                                        // pinheiros de Hyarmeth
    at(PINE, PINEC, 12, 120, 190, 540, 80, r2);                                         // pinheiros do sul de Imladrin
    const cx = 17, cy = 22;
    c.fillStyle = '#ece2c4';
    for (let d = -6; d <= 6; d++) { c.fillRect(cx + d, cy, 1, 1); c.fillRect(cx, cy + d, 1, 1); }
    c.fillStyle = '#ffcf4a'; c.fillRect(cx - 1, cy - 6, 3, 3);
    spr(['n...n', 'nn..n', 'n.n.n', 'n..nn', 'n...n'], { n: '#ece2c4' }, cx - 2, cy - 13);
    return cv;
  }

  // ---------- Janela ----------
  let root, mapBox, cell, info, list, open = false, sel = null, done = null, items = [];
  const here = () => G.mode === 'explore' ? 'cripta' : G.area === 'cemiterio' ? 'cemiterio' : 'valmor';

  function build() {
    root = document.createElement('div');
    root.id = 'worldmap';
    root.innerHTML = `<div class="wm-head win"><span>Mapa de Eterra</span><button class="wm-close">✕ Fechar</button></div>
      <div class="wm-cell"><div class="wm-map"></div></div><div class="wm-info win"><div class="wm-detail"></div><div class="wm-list"></div></div>`;
    document.getElementById('screen').appendChild(root);
    mapBox = root.querySelector('.wm-map'); cell = root.querySelector('.wm-cell'); info = root.querySelector('.wm-detail'); list = root.querySelector('.wm-list');
    root.querySelector('.wm-close').onclick = ev => { ev.stopPropagation(); close(); };
    root.addEventListener('click', ev => ev.stopPropagation()); // não avança o texto do jogo por baixo
    new ResizeObserver(fit).observe(cell);
    // Modo do autor: só existe no computador do Daniel (docs/ fica fora do GitHub). No site público dá 404 e nada muda.
    const sc = document.createElement('script');
    sc.src = 'docs/mapa-autor.js';
    sc.onload = () => { if (open) { const id = sel && sel.id; render(); select(items.find(o => o.id === id) || items[0], false); } };
    sc.onerror = () => sc.remove();
    document.head.appendChild(sc);
  }
  function fit() {
    if (!open) return;
    const r = cell.getBoundingClientRect(), s = Math.min(r.width / 1000, r.height / 700);
    mapBox.style.width = Math.floor(1000 * s) + 'px'; mapBox.style.height = Math.floor(700 * s) + 'px';
  }

  function render() {
    if (!mapCanvas) mapCanvas = paint();
    mapBox.replaceChildren(mapCanvas);
    items = [];
    const A = window.WORLD_AUTOR, extra = {};
    root.classList.toggle('autor', !!A);
    root.querySelector('.wm-head span').textContent = A ? 'Mapa de Eterra · modo do autor' : 'Mapa de Eterra';
    if (A) for (const p of A.pontos) if (p.jogo) extra[p.jogo] = p;
    for (const [nome, k] of Object.entries(WORLD_REINOS))
      items.push({ id: 'r:' + nome, nome, x: k.x, y: k.y, isReino: true, text: A && A.reinos[nome] ? () => A.reinos[nome] : k.text });
    for (const p of WORLD_POIS) {
      const a = extra[p.id];
      if (A) items.push({ ...p, autor: a, text: () => p.text() + (a && a.resumo ? '\nNos bastidores: ' + a.resumo : '') });
      else if (p.show()) items.push(p);
    }
    if (A) for (const a of A.pontos) if (!a.jogo)
      items.push({ ...a, segredo: true, autor: a, visto: () => false, text: () => a.resumo || 'Só o nome, por enquanto. A história deste lugar ainda está para ser escrita.' });
    const at = here();
    for (const it of items) {
      const b = document.createElement('button');
      const state = it.isReino ? 'reino' : it.id === at ? 'aqui' : it.segredo ? 'segredo' : it.visto() ? 'visto' : 'boato';
      b.className = 'wm-pt ' + state;
      b.style.left = it.x / 10 + '%'; b.style.top = it.y / 7 + '%';
      b.innerHTML = it.isReino ? `<span class="wm-k">${esc(it.nome)}</span>` : `<i></i><span class="wm-lbl">${esc(it.nome)}</span>`;
      b.setAttribute('aria-label', it.nome);
      b.onclick = ev => { ev.stopPropagation(); select(it, true); };
      it.el = b; it.state = state;
      mapBox.appendChild(b);
    }
    renderList();
  }
  // Side panel list: every known place, grouped by kingdom; a click selects it on the map
  function renderList() {
    const groups = {};
    for (const it of items) if (!it.isReino) (groups[it.reino || '—'] ||= []).push(it);
    list.replaceChildren(...Object.entries(groups).flatMap(([reino, its]) => {
      const h = document.createElement('h3'); h.textContent = reino;
      return [h, ...its.map(it => {
        const r = document.createElement('button');
        r.className = 'wm-row';
        r.innerHTML = `<b class="${it.state}"></b><span>${esc(it.nome)}</span>`;
        r.onclick = ev => { ev.stopPropagation(); select(it, true); };
        it.row = r;
        return r;
      })];
    }));
  }
  function select(it, sound) {
    if (sound && sel !== it) Sfx.cursor();
    sel = it;
    for (const o of items) { o.el.classList.toggle('sel', o === it); o.row?.classList.toggle('sel', o === it); }
    it.row?.scrollIntoView({ block: 'nearest' });
    info.parentElement.scrollTop = 0;
    const CAP = { '1': 'Cap. 1', '2': 'Cap. 2', '3': 'Cap. 3', '4': 'Cap. 4', final: 'Final' };
    const ST = { 'no-jogo': 'já no jogo', planejado: 'planejado', ideia: 'ideia' };
    const a = it.autor;
    const tag = it.isReino ? 'Reino' : `${it.tipo} · ${it.reino}` + (it.state === 'aqui' ? ' · Você está aqui' : it.state === 'boato' ? ' · Só ouviu falar' : it.state === 'segredo' ? ' · Segredo' : '') +
      (a ? ` · ${CAP[a.capitulo] || 'sem capítulo'} · ${ST[a.status] || a.status}` : '');
    info.innerHTML = `<div class="wm-name">${esc(it.nome)}</div><div class="wm-tag">${esc(tag)}</div>` +
      it.text().split('\n').map(t => `<p>${esc(t)}</p>`).join('');
  }
  // setas: vai para o ponto mais próximo naquela direção
  function move(dx, dy) {
    let best = null, bs = Infinity;
    for (const o of items) {
      if (o === sel) continue;
      const vx = o.x - sel.x, vy = o.y - sel.y, along = vx * dx + vy * dy;
      if (along <= 0) continue;
      const s = along + 2.5 * Math.abs(vx * dy - vy * dx);
      if (s < bs) { bs = s; best = o; }
    }
    if (best) select(best, true);
  }

  function show() {
    if (!root) build();
    open = true; root.classList.add('open');
    render(); fit();
    select(items.find(o => o.id === here()) || items[0], false);
    Sfx.select();
    return new Promise(res => { done = res; });
  }
  function close() {
    if (!open) return;
    open = false; root.classList.remove('open'); Sfx.cancel();
    const d = done; done = null; d && d();
  }
  function key(k) {
    const dirs = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
    if (dirs[k]) move(...dirs[k]);
    else if (['Escape', 'u', 'm', 'Tab', 'Backspace', 'Enter', ' '].includes(k)) close();
  }
  return { show, close, key, isOpen: () => open };
})();
