// ===== Retratos de quem fala (busto 32×32 em pixel art, gerado por código) =====
// As cores vêm de LOOKS (src/town.js) quando o personagem tem sprite; os outros têm cores próprias aqui.
// O nome da fala ("Nome:\ntexto") escolhe o retrato; narração (sem nome) fica sem retrato.

const Portraits = (() => {
  // hair: short | long | bun | bald | none · top: hat | helmet | hood | veil · beard: stubble | mustache | full | long
  const FACES = {
    aldo:     { look: 'aldo', hair: 'short', brow: 1 },
    lyra:     { look: 'lyra', hair: 'long' },
    teo:      { look: 'teo', hair: 'short' },
    andilla:  { look: 'andilla', hair: 'short', brow: 1 },
    berta:    { look: 'berta', hair: 'bun', blush: 1 },
    ana:      { look: 'ana', hair: 'bun', old: 1 },
    rui:      { look: 'rui', hair: 'short', top: 'hat', beard: 'stubble' },
    bruno:    { look: 'soldier', hair: 'short', top: 'helmet', beard: 'mustache', hairCol: '#5a3a1a' },
    caio:     { look: 'soldier', hair: 'short', top: 'helmet', hairCol: '#2a1a10' },
    tobias:   { look: 'tobias', hair: 'short', bandage: 1, c: { skin: '#e8c8a8' } }, // pálido e ferido
    hooded:   { look: 'hooded', hair: 'none', top: 'hood', glow: '#ff3040' },
    hugo:     { look: 'guard', hair: 'short', top: 'helmet', beard: 'mustache', hairCol: '#6a6a6a' },
    lia:      { look: 'lia', hair: 'long', kid: 1, blush: 1 },
    marta:    { look: 'marta', hair: 'bun', old: 1 },
    tome:     { look: 'tome', hair: 'short', beard: 'full' },
    nino:     { look: 'nino', hair: 'short', kid: 1 },
    bertoldo: { c: { skin: '#e8c0a0', hair: '#f2f2f2', body: '#3a7a3a' }, hair: 'bald', beard: 'long', old: 1 },
    irene:    { c: { skin: '#f0c8a0', hair: '#3a2a1a', body: '#e8eef8', veil: '#2a3a7a' }, hair: 'none', top: 'veil' },
    dora:     { c: { skin: '#e0a878', hair: '#7a3a1a', body: '#d8a830' }, hair: 'long', blush: 1 },
    morvath:  { special: 'lich' },
    sineiro:  { special: 'sineiro' },
    clara:    { look: 'clara', hair: 'long', blush: 1 },
    cat:      { special: 'cat' },
    scroll:   { special: 'scroll' },
    stone:    { special: 'stone' },
  };
  const BY_NAME = { 'Mensageiro': 'tobias', 'Encapuzado': 'hooded', 'Guarda Hugo': 'hugo', 'Ancião Bertoldo': 'bertoldo',
    'Irmã Irene': 'irene', 'Dona Marta': 'marta', 'Bigode': 'cat', 'Bilhete': 'scroll', 'Lápide': 'stone', 'Moça dos dados': 'andilla', 'O Sineiro': 'sineiro' };
  const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function keyFor(name) {
    if (!name) return null;
    const hero = PARTY_DEFS.find(d => d.name === name);
    if (hero) return hero.id;
    if (BY_NAME[name]) return BY_NAME[name];
    if (/^Carta/.test(name)) return 'scroll';
    const first = plain(name.split(/[ ,]/)[0]);
    return FACES[first] ? first : null;
  }

  const cache = {};
  // mood (alegre | preocupado | bravo) only changes the hand-drawn hero faces
  function draw(key, mood) {
    // Hand-drawn hero faces (src/herofaces.js): the 32×32 grid over the background bands
    if (HERO_FACES[key]) return GridSprite.render(heroFace(key, mood));
    if (cache[key]) return cache[key];
    const F = FACES[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const c = cv.getContext('2d');
    const p = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    // fundo: faixas da janela
    ['#24327f', '#1d2a74', '#172264', '#111a52'].forEach((col, i) => p(0, i * 8, 32, 8, col));
    if (F.special) { SPECIAL[F.special](p); return (cache[key] = cv); }

    const L = Object.assign({}, F.look ? LOOKS[F.look] : {}, F.c || {});
    const skin = L.skin, skinD = shadeHex(skin, 0.8), skinDD = shadeHex(skin, 0.65);
    const hair = F.hairCol || L.hair, hairD = shadeHex(hair, 0.7);
    const body = L.body, bodyD = shadeHex(body, 0.7);
    const k = F.kid ? 1 : 0; // criança: rosto mais baixo e olhos maiores

    // ombros e roupa
    p(4, 26, 24, 6, body); p(6, 25, 20, 1, body); p(4, 30, 24, 2, bodyD); p(25, 26, 3, 6, bodyD);
    if (L.robe) { p(14, 25, 4, 3, skinD); p(15, 28, 2, 1, skinD); } else { p(12, 25, 8, 1, bodyD); }
    if (L.mark) p(14, 28, 4, 2, L.mark);
    if (F.top === 'helmet') { p(4, 26, 24, 1, '#c8d0dc'); p(8, 28, 2, 2, '#c8d0dc'); p(22, 28, 2, 2, '#c8d0dc'); }
    // pescoço
    p(13, 22, 6, 4, skinD);
    // cabelo comprido por trás
    if (F.hair === 'long') { p(8, 9 + k, 3, 18 - k, hair); p(21, 9 + k, 3, 18 - k, hair); p(9, 26, 2, 1, hairD); p(21, 26, 2, 1, hairD); }
    if (F.top === 'hood' || F.top === 'veil') {
      const hc = F.top === 'veil' ? L.veil : L.hat;
      p(7, 5, 18, 22, hc); p(6, 9, 20, 18, hc); p(24, 9, 2, 18, shadeHex(hc, 0.7));
      if (F.top === 'veil') { p(9, 8, 14, 2, '#f4f4f4'); }
    }
    // rosto
    const fy = 8 + k * 2, fh = 15 - k * 2;
    p(10, fy, 12, fh, skin); p(11, fy + fh, 10, 1, skin); p(12, fy + fh + 1, 8, 1, skinD);
    p(21, fy + 1, 1, fh - 1, skinD); // sombra do lado direito
    p(9, fy + 6, 1, 3, skinD); p(22, fy + 6, 1, 3, skinDD); // orelhas
    if (F.top === 'hood') { p(10, fy, 12, fh + 2, shadeHex(skin, 0.35)); }

    // olhos
    const ey = fy + 7 - k;
    if (F.glow) { p(12, ey, 2, 1, F.glow); p(18, ey, 2, 1, F.glow); }
    else {
      p(12, ey, 2, 2 + k, '#fff'); p(18, ey, 2, 2 + k, '#fff');
      p(13, ey, 1, 2 + k, '#1a1430'); p(18, ey, 1, 2 + k, '#1a1430');
      p(12, ey - 2, 3, 1, F.brow ? hairD : shadeHex(hair, 0.85)); p(17, ey - 2, 3, 1, F.brow ? hairD : shadeHex(hair, 0.85));
      if (F.brow) { p(12, ey - 1, 1, 1, hairD); p(19, ey - 1, 1, 1, hairD); }
      if (F.old) { p(12, ey + 2 + k, 2, 1, skinD); p(18, ey + 2 + k, 2, 1, skinD); p(14, fy + 2, 4, 1, skinD); }
    }
    if (F.top !== 'hood') {
      p(15, ey + 3, 2, 2, skinD); // nariz
      p(14, ey + 6, 4, 1, '#9a4a44'); // boca
      if (F.blush) { p(11, ey + 3, 2, 1, '#f09090'); p(19, ey + 3, 2, 1, '#f09090'); }
    }
    // barba
    if (F.beard === 'stubble') { p(11, ey + 5, 10, 1, skinDD); p(12, ey + 7, 8, 1, skinDD); }
    if (F.beard === 'mustache') { p(13, ey + 5, 6, 1, hair); p(12, ey + 6, 1, 1, hair); p(19, ey + 6, 1, 1, hair); }
    if (F.beard === 'full') { p(10, ey + 4, 12, fy + fh - ey - 3, hair); p(11, fy + fh + 1, 10, 1, hair); p(14, ey + 6, 4, 1, '#7a3a34'); }
    if (F.beard === 'long') { p(10, ey + 4, 12, 9, hair); p(11, ey + 13, 10, 3, hair); p(13, ey + 16, 6, 2, hair); p(14, ey + 5, 4, 1, '#c8a090'); p(21, ey + 5, 1, 10, '#c8c8c8'); }

    // cabelo / chapéu por cima
    if (F.hair === 'short' || F.hair === 'long') { p(10, fy - 2, 12, 3, hair); p(9, fy - 1, 14, 3, hair); p(9, fy + 2, 2, 4, hair); p(21, fy + 2, 2, 4, hair); p(11, fy - 2, 8, 1, shadeHex(hair, 1.2)); }
    if (F.hair === 'bun') { p(10, fy - 2, 12, 3, hair); p(9, fy - 1, 14, 3, hair); p(9, fy + 2, 2, 5, hair); p(21, fy + 2, 2, 5, hair); p(13, fy - 5, 6, 3, hair); p(14, fy - 6, 4, 1, hair); }
    if (F.hair === 'bald') { p(9, fy + 3, 2, 5, hair); p(21, fy + 3, 2, 5, hair); p(13, fy + 1, 3, 1, shadeHex(skin, 1.08)); }
    if (F.top === 'hat') { p(8, fy - 1, 16, 2, L.hat); p(10, fy - 4, 12, 3, L.hat); p(10, fy - 1, 12, 1, shadeHex(L.hat, 0.7)); }
    if (F.bandage) { p(9, fy + 1, 14, 2, '#f4f0e8'); p(18, fy + 1, 2, 2, '#c02828'); }
    if (F.top === 'helmet') { const m = L.hat || '#a0a8b8'; p(9, fy - 3, 14, 5, m); p(8, fy + 1, 16, 2, shadeHex(m, 0.8)); p(11, fy - 3, 6, 1, '#e0e6f0'); p(8, fy + 3, 2, 4, shadeHex(m, 0.8)); p(22, fy + 3, 2, 4, shadeHex(m, 0.8)); }
    return (cache[key] = cv);
  }

  const SPECIAL = {
    lich(p) { // Morvath: caveira coroada no capuz roxo, olhos verdes (cores do sprite da batalha)
      p(5, 6, 22, 26, '#4a2a6a'); p(4, 12, 24, 20, '#4a2a6a'); p(24, 10, 4, 22, '#341a4e');
      p(9, 9, 14, 13, '#e8e0c8'); p(10, 22, 12, 3, '#d8d0b8'); p(21, 10, 2, 12, '#b8b098');
      p(11, 13, 4, 4, '#1a1020'); p(17, 13, 4, 4, '#1a1020'); p(12, 14, 2, 2, '#40ff80'); p(18, 14, 2, 2, '#40ff80');
      p(15, 18, 2, 2, '#3a3030'); for (let x = 11; x < 21; x += 2) p(x, 23, 1, 2, '#3a3030');
      p(9, 4, 14, 4, '#d4a72c'); p(9, 2, 2, 2, '#d4a72c'); p(15, 1, 2, 3, '#d4a72c'); p(21, 2, 2, 2, '#d4a72c'); p(15, 5, 2, 2, '#e02040');
      p(12, 27, 8, 2, '#d4a72c');
    },
    sineiro(p) { // o Sineiro: crânio no capuz da batina, sino de bronze e a corda
      p(5, 8, 22, 24, '#3a3046'); p(4, 14, 24, 18, '#3a3046'); p(24, 12, 4, 20, '#2a2234'); p(8, 5, 16, 5, '#2a2234');
      p(10, 10, 12, 12, '#e8e0c8'); p(11, 22, 10, 3, '#d8d0b8'); p(20, 11, 2, 11, '#b8b098');
      p(12, 14, 3, 4, '#1a1020'); p(17, 14, 3, 4, '#1a1020'); p(13, 15, 1, 1, '#9fd8ff'); p(18, 15, 1, 1, '#9fd8ff');
      p(15, 19, 2, 2, '#3a3030'); for (let x = 12; x < 21; x += 2) p(x, 23, 1, 2, '#3a3030');
      p(13, 26, 2, 6, '#8a7a52'); p(18, 26, 2, 6, '#8a7a52');
      p(1, 25, 9, 6, '#b8862a'); p(2, 24, 7, 1, '#f0c860'); p(3, 23, 5, 1, '#b8862a'); p(5, 31, 2, 1, '#6a4a14');
      p(27, 0, 1, 14, '#8a6a3a');
    },
    cat(p) {
      p(7, 6, 4, 6, '#e09038'); p(21, 6, 4, 6, '#e09038'); p(8, 8, 2, 3, '#f8a0a0'); p(22, 8, 2, 3, '#f8a0a0');
      p(6, 11, 20, 15, '#e09038'); p(8, 26, 16, 6, '#e09038'); p(12, 11, 2, 4, '#b06a20'); p(18, 11, 2, 4, '#b06a20');
      p(10, 16, 3, 3, '#80d040'); p(19, 16, 3, 3, '#80d040'); p(11, 16, 1, 3, '#222'); p(20, 16, 1, 3, '#222');
      p(15, 20, 2, 1, '#f8a0a0'); p(14, 22, 1, 1, '#222'); p(17, 22, 1, 1, '#222'); p(3, 20, 6, 1, '#fff'); p(23, 20, 6, 1, '#fff');
    },
    scroll(p) { // carta / bilhete: rolo com selo
      p(6, 8, 20, 16, '#efe0b0'); p(4, 6, 24, 3, '#c8b078'); p(4, 23, 24, 3, '#c8b078');
      for (let y = 11; y < 22; y += 3) p(9, y, 14, 1, '#8a7a5a');
      p(14, 18, 5, 5, '#b02030'); p(15, 19, 3, 3, '#e04050');
    },
    stone(p) { // lápide
      p(8, 6, 16, 24, '#8a8a96'); p(10, 4, 12, 2, '#8a8a96'); p(22, 6, 2, 24, '#6a6a76');
      for (let y = 10; y < 26; y += 3) p(11, y, 10, 1, '#4a4a56'); p(15, 6, 1, 22, '#3a3a44');
    },
  };

  return { keyFor, draw, FACES };
})();
