// ===== Mapa de Eterra: o mapa-múndi do jogo, com pontos de interesse =====
// Coordenadas 0–1000 × 0–700, as mesmas do artefato "Mapa de Eterra" (onde o Daniel anota a história).
// Um ponto só aparece quando o grupo já ouviu falar dele: o mapa cresce junto com a história.
// Para pôr um lugar novo: acrescente um item em WORLD_POIS com show() e text().

const WORLD_REINOS = {
  Formeth:  { x: 520, y: 165, text: () => 'O reino do norte. Clima temperado, com montanhas, vales e florestas.\nSeus clãs conquistaram as próprias terras com magia.' },
  Imladrin: { x: 175, y: 300, text: () => 'O reino do oeste, o mais progressista de Eterra e o único com uma rainha.\nÉ farto, por isso vive sendo atacado, mas os paladinos da Ordem de Erukh o defendem bem.' },
  Sindarin: { x: 820, y: 330, text: () => 'O reino do leste: muito quente, com áreas de deserto.\nOs clãs vivem separados e não se entendem. Nos outros reinos dizem que nada de bom sai do leste.' },
  Hyarmeth: { x: 290, y: 520, text: () => 'O reino do sul. Frio, com geadas no extremo sul e florestas perto de Formeth.\nSeus homens têm fama de bravos e destemidos em batalha.' },
};

// visto: o grupo já esteve lá (ou está). Sem visto(), o lugar é só um nome ouvido por aí.
const WORLD_POIS = [
  { id: 'valmor', nome: 'Valmor', reino: 'Hyarmeth', tipo: 'Vila', x: 430, y: 555, show: () => true, visto: () => true,
    text: () => 'Vila do sul gelado, na estrada do oeste. Uma capela, a casa do ancião e a Taverna do Caldeirão Partido.\n' +
      (G.bossDead ? 'Os mortos voltaram a dormir. A estrada para Erukh está aberta.'
        : G.intro ? 'Um mensageiro do Templo caiu ferido na taverna. Encapuzados queriam a carta que ele trazia.'
        : G.seen.job ? 'Alguém, ou alguma coisa, anda abrindo as covas do cemitério.'
        : `${heroName('aldo')} acabou de chegar, procurando pouso para o inverno.`) },
  { id: 'cemiterio', nome: 'Cemitério de Valmor', reino: 'Hyarmeth', tipo: 'Cemitério', x: 385, y: 622, show: () => G.seen.job, visto: () => G.seen.cemEntrou,
    text: () => 'Atrás da capela, no alto da vila.\n' +
      (G.seen.covas ? 'Algumas covas foram cavadas de fora, com pá. Outras foram abertas por dentro.'
        : 'A Berta troca o quarto por um favor: ver as covas abertas.') },
  { id: 'cripta', nome: 'Cripta de Valmor', reino: 'Hyarmeth', tipo: 'Masmorra', x: 470, y: 595, show: () => G.quest || G.reached, visto: () => G.reached,
    text: () => 'Paladinos fecharam esta cripta há muito tempo, na guerra de Elun. Algo dorme lá embaixo.\n' +
      (G.bossDead ? 'Morvath virou pó. Antes, disse que não foi ele quem abriu o selo.'
        : G.seen.altar ? 'No altar, escreveram "O rei voltará".'
        : G.seen.lapide ? 'Uma lápide diz o nome do rei: Morvath. Ele traiu a luz.'
        : 'O ancião quer um grupo de quatro para descer.') },
  { id: 'templo', nome: 'Templo de Erukh', reino: 'Hyarmeth', tipo: 'Templo', x: 570, y: 535, show: () => true, visto: () => false,
    text: () => 'O templo mais conhecido do sul. Famílias deixam ali os filhos para serem treinados como guerreiros de Yah.' +
      (G.intro ? '\nDe lá veio o mensageiro ferido, com uma carta do sumo sacerdote Shulkhan.' : '') },
  { id: 'erukh', nome: 'Erukh', reino: 'Imladrin', tipo: 'Capital', x: 165, y: 360, show: () => true, visto: () => false,
    text: () => 'Capital de Imladrin: monumentos, arte e engenharia. Cidade da rainha Lara e sede da Ordem de Erukh.' +
      (G.bossDead ? '\nO próximo destino. Tobias pediu: não confiar em ninguém antes da rainha.'
        : G.intro ? '\nA carta lacrada precisa chegar às mãos da rainha.' : '') },
  { id: 'purpura', nome: 'Floresta Púrpura', reino: 'Imladrin', tipo: 'Floresta', x: 340, y: 300, show: () => true, visto: () => false,
    text: () => 'Uma floresta mágica. Os viajantes contam que é protegida pela Liga Branca.' },
  { id: 'lago', nome: 'Lago dos Ventos Uivantes', reino: 'Hyarmeth', tipo: 'Lago', x: 400, y: 440, show: () => true, visto: () => false,
    text: () => 'Um lago no caminho entre o sul e o oeste. Quem passa por lá não esquece o barulho do vento.' },
  { id: 'lothriel', nome: 'Lothriel', reino: 'Formeth', tipo: 'Cidade', x: 455, y: 235, show: () => true, visto: () => false,
    text: () => 'Cidade de Formeth num vale de árvores. As casas de madeira ficam tão juntas dos troncos que parecem crescer com eles.' },
  { id: 'gloerin', nome: 'Floresta Glóerin', reino: 'Formeth', tipo: 'Floresta', x: 300, y: 165, show: () => true, visto: () => false,
    text: () => 'Dizem que ali vive a maioria dos elfos da floresta.' },
  { id: 'ahk', nome: 'Monastério de Ahk', reino: 'Sindarin', tipo: 'Templo', x: 830, y: 385, show: () => true, visto: () => false,
    text: () => 'Monges de Sindarin guardam ali papiros muito antigos.' },
  { id: 'sufuri', nome: 'Deserto Súfuri', reino: 'Sindarin', tipo: 'Deserto', x: 860, y: 470, show: () => true, visto: () => false,
    text: () => 'Areia e calor sem fim, no leste de Sindarin.' },
];

const WorldMap = (() => {
  const W = 250, H = 175, K = 4; // 1 pixel do mapa = 4 unidades do mundo
  const COAST = 'M120,170 C150,90 300,60 420,80 C520,40 640,70 720,60 C820,55 905,120 890,210 C930,290 905,360 930,430 C950,520 870,600 760,610 C680,640 560,600 480,640 C380,672 260,632 190,592 C110,560 70,480 100,400 C60,330 80,240 120,170 Z';
  const ISLES = ['M40,610 c20,-25 60,-20 70,5 c-10,25 -55,30 -70,-5z', 'M935,95 c15,-20 45,-10 45,10 c-5,20 -40,25 -45,-10z'];
  const C = [500, 350];
  const REG = {
    Formeth: [[0, 0], [1000, 0], [1000, 200], [760, 230], C, [240, 230], [0, 200]],
    Imladrin: [[0, 200], [240, 230], C, [220, 470], [0, 500]],
    Sindarin: [[1000, 200], [760, 230], C, [780, 480], [1000, 520]],
    Hyarmeth: [[0, 500], [220, 470], C, [780, 480], [1000, 520], [1000, 700], [0, 700]],
  };
  const PAL = {
    sea: '#1a3f7c', wave: '#3a6ab0', shallow: '#2a5aa0', ink: '#0a1230', lake: '#2a5aa0',
    Formeth: ['#3f7a3a', '#4e8a40', '#336a32'], Imladrin: ['#8aa04a', '#9cb055', '#76903e'],
    Sindarin: ['#d6ad5c', '#e4c070', '#bf9448'], Hyarmeth: ['#7e9a86', '#8faa94', '#6c8a76'],
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
    const coast = new Path2D(COAST), isles = ISLES.map(d => new Path2D(d));
    const land = new Uint8Array(W * H), water = new Uint8Array(W * H);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const X = px * K + 2, Y = py * K + 2;
      const onLand = c.isPointInPath(coast, X, Y) || isles.some(p => c.isPointInPath(p, X, Y));
      const lake = ((X - 400) / 34) ** 2 + ((Y - 440) / 18) ** 2 < 1;
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
        if (reg === 'Hyarmeth' && Y + noise(px, py, 6) * 60 > 600) pal = PAL.snow; // o sul gelado
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
    for (const k of ['Formeth', 'Imladrin', 'Sindarin']) {
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
    const r = rng(42);
    const mtn = (x, y) => spr(MTN, MTNC, Math.round(x / K) - 3, Math.round(y / K) - 4);
    for (let i = 0; i < 26; i++) { const x = 380 + r() * 340, y = 95 + r() * 70; r(); mtn(x, y); }
    for (let i = 0; i < 12; i++) { const x = 720 + r() * 120, y = 180 + r() * 90; r(); mtn(x, y); }
    for (let i = 0; i < 40; i++) spr(TREE, TREEC, Math.round((240 + r() * 130) / K), Math.round((120 + r() * 80) / K));
    for (let i = 0; i < 26; i++) spr(TREE, { g: '#7a3a8a', G: '#4e2260', t: '#3a2030' }, Math.round((300 + r() * 80) / K), Math.round((270 + r() * 60) / K));
    for (let i = 0; i < 30; i++) spr(DUNE, { d: '#a87c38' }, Math.round((780 + r() * 130) / K), Math.round((380 + r() * 140) / K));
    const r2 = rng(7);
    for (let i = 0; i < 22; i++) spr(PINE, PINEC, Math.round((240 + r2() * 480) / K), Math.round((500 + r2() * 70) / K));
    for (let i = 0; i < 14; i++) spr(TREE, TREEC, Math.round((420 + r2() * 160) / K), Math.round((210 + r2() * 50) / K));
    // rosa dos ventos
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
