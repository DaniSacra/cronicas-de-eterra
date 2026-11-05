// ===== Renderizador 3D por raycasting (estilo dungeon crawler clássico) =====

let VW = 320, VH = 200;
const view = document.getElementById('view');
const vctx = view.getContext('2d');
let vimg = vctx.createImageData(VW, VH);
let vbuf = new Uint32Array(vimg.data.buffer);
let zbuf = new Float32Array(VW);
function resizeView(w, h) {
  if (w === VW && h === VH) return false;
  VW = w; VH = h; view.width = w; view.height = h;
  vimg = vctx.createImageData(w, h); vbuf = new Uint32Array(vimg.data.buffer); zbuf = new Float32Array(w);
  return true;
}
let TEX = null;

// Janela clássica desenhada no canvas (mesmas cores da janela em CSS): faixas azuis, moldura tinta/osso/latão, cantos recortados
const WIN_BANDS = ['#2b3b8f', '#243284', '#1d2a74', '#172264', '#111a52'], WIN_STOPS = [0, .1, .28, .5, .74, 1];
function drawWindow(c, x, y, w, h) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  WIN_BANDS.forEach((col, i) => { const a = y + Math.round(h * WIN_STOPS[i]), b = y + Math.round(h * WIN_STOPS[i + 1]); c.fillStyle = col; c.fillRect(x, a, w, b - a); });
  const ring = (k, col) => { c.fillStyle = col; c.fillRect(x + k + 1, y + k, w - 2 * k - 2, 1); c.fillRect(x + k + 1, y + h - k - 1, w - 2 * k - 2, 1);
    c.fillRect(x + k, y + k + 1, 1, h - 2 * k - 2); c.fillRect(x + w - k - 1, y + k + 1, 1, h - 2 * k - 2); };
  c.clearRect(x, y, 1, 1); c.clearRect(x + w - 1, y, 1, 1); c.clearRect(x, y + h - 1, 1, 1); c.clearRect(x + w - 1, y + h - 1, 1, 1);
  ring(0, '#07081a'); ring(1, '#ece2c4'); ring(2, '#8c6a2c');
  c.fillStyle = '#ece2c4'; c.fillRect(x + 1, y + 1, 1, 1); c.fillRect(x + w - 2, y + 1, 1, 1); c.fillRect(x + 1, y + h - 2, 1, 1); c.fillRect(x + w - 2, y + h - 2, 1, 1);
}

function light(d) { return 1.25 / (1 + d * d * 0.1); }

function renderView(cam, map, sprites, now) {
  const px = cam.x, py = cam.y, a = cam.a;
  const dirX = Math.cos(a), dirY = Math.sin(a), K = 0.66 * (VW / VH) / 1.6, planeX = -dirY * K, planeY = dirX * K;
  const fl = 1 + Math.sin(now * 0.008) * 0.035 + Math.sin(now * 0.0213) * 0.025;
  const N = map.size, g = map.grid, half = VH / 2;
  const fT = TEX.floor.d, cT = TEX.ceil.d, sT = TEX.stairs.d;
  const r0x = dirX - planeX, r0y = dirY - planeY, r1x = dirX + planeX, r1y = dirY + planeY;

  // Chão e teto
  for (let y = half; y < VH; y++) {
    const rd = half / (y - half + 0.5);
    const sh = light(rd) * fl, sr = sh * 1.1, sg = sh * 0.97, sb = sh * 0.84;
    let fx = px + rd * r0x, fy = py + rd * r0y;
    const stx = rd * (r1x - r0x) / VW, sty = rd * (r1y - r0y) / VW;
    const rf = y * VW, rc = (VH - 1 - y) * VW;
    for (let x = 0; x < VW; x++) {
      const cx = Math.floor(fx), cy = Math.floor(fy);
      const ti = ((((fy - cy) * 64) | 0) * 64 + (((fx - cx) * 64) | 0)) * 3;
      const T = (cx >= 0 && cy >= 0 && cx < N && cy < N && g[cy * N + cx] === 2) ? sT : fT;
      let r = T[ti] * sr, gg = T[ti + 1] * sg, b = T[ti + 2] * sb;
      vbuf[rf + x] = 0xff000000 | ((b > 255 ? 255 : b) << 16) | ((gg > 255 ? 255 : gg) << 8) | (r > 255 ? 255 : r);
      r = cT[ti] * sr; gg = cT[ti + 1] * sg; b = cT[ti + 2] * sb;
      vbuf[rc + x] = 0xff000000 | ((b > 255 ? 255 : b) << 16) | ((gg > 255 ? 255 : gg) << 8) | (r > 255 ? 255 : r);
      fx += stx; fy += sty;
    }
  }

  // Paredes
  for (let x = 0; x < VW; x++) {
    const camX = 2 * x / VW - 1;
    const rdx = dirX + planeX * camX, rdy = dirY + planeY * camX;
    let mx = Math.floor(px), my = Math.floor(py);
    const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
    let stepX, stepY, sdx, sdy;
    if (rdx < 0) { stepX = -1; sdx = (px - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - px) * ddx; }
    if (rdy < 0) { stepY = -1; sdy = (py - my) * ddy; } else { stepY = 1; sdy = (my + 1 - py) * ddy; }
    let side = 0;
    for (let i = 0; i < 80; i++) {
      if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
      if (mx < 0 || my < 0 || mx >= N || my >= N || g[my * N + mx] === 1) break;
    }
    const perp = Math.max(0.01, side === 0 ? sdx - ddx : sdy - ddy);
    zbuf[x] = perp;
    const lh = VH / perp;
    const ds = Math.floor(half - lh / 2), de = Math.floor(half + lh / 2);
    let wx = side === 0 ? py + perp * rdy : px + perp * rdx; wx -= Math.floor(wx);
    let tx = (wx * 64) | 0;
    if (side === 0 && rdx > 0) tx = 63 - tx;
    if (side === 1 && rdy < 0) tx = 63 - tx;
    const wv = (mx >= 0 && my >= 0 && mx < N && my < N) ? map.wallVar[my * N + mx] : 0;
    const D = TEX.walls[wv].d, E = TEX.walls[wv].e;
    const sh = light(perp) * fl * (side ? 0.78 : 1);
    const emitS = fl * 1.05;
    const step = 64 / lh;
    const y0 = Math.max(0, ds), y1 = Math.min(VH - 1, de);
    let tp = (y0 - half + lh / 2) * step;
    for (let y = y0; y <= y1; y++) {
      const ti = ((tp | 0) & 63) * 64 + tx; tp += step;
      const s = E[ti] ? (sh > emitS ? sh : emitS) : sh;
      const r = D[ti * 3] * s * 1.1, gg = D[ti * 3 + 1] * s * 0.97, b = D[ti * 3 + 2] * s * 0.84;
      vbuf[y * VW + x] = 0xff000000 | ((b > 255 ? 255 : b) << 16) | ((gg > 255 ? 255 : gg) << 8) | (r > 255 ? 255 : r);
    }
  }

  // Sprites (baús, fonte, chefe)
  const invDet = 1 / (planeX * dirY - dirX * planeY);
  const list = sprites.map(o => ({ o, d: (o.x - px) ** 2 + (o.y - py) ** 2 })).sort((p, q) => q.d - p.d);
  for (const { o } of list) {
    const sx = o.x - px, sy = o.y - py;
    const tX = invDet * (dirY * sx - dirX * sy), tY = invDet * (-planeY * sx + planeX * sy);
    if (tY < 0.3) continue;
    const S = o.spr;
    const scrX = (VW / 2) * (1 + tX / tY);
    const full = VH / tY, sh = full * (o.scale || 1), sw = sh * S.w / S.h;
    const bottom = half + full / 2 - (o.lift || 0) * full, top = bottom - sh;
    const left = scrX - sw / 2;
    let shade = light(tY) * fl; if (o.emit) shade = Math.max(shade, o.emit);
    const xa = Math.max(0, Math.floor(left)), xb = Math.min(VW, Math.ceil(left + sw));
    const ya = Math.max(0, Math.floor(top)), yb = Math.min(VH, Math.ceil(bottom));
    for (let x = xa; x < xb; x++) {
      if (tY >= zbuf[x]) continue;
      const u = Math.floor((x - left) * S.w / sw); if (u < 0 || u >= S.w) continue;
      for (let y = ya; y < yb; y++) {
        const v = Math.floor((y - top) * S.h / sh); if (v < 0 || v >= S.h) continue;
        const i = (v * S.w + u) * 4; if (S.d[i + 3] < 128) continue;
        const r = S.d[i] * shade * 1.05, gg = S.d[i + 1] * shade, b = S.d[i + 2] * shade * 0.92;
        vbuf[y * VW + x] = 0xff000000 | ((b > 255 ? 255 : b) << 16) | ((gg > 255 ? 255 : gg) << 8) | (r > 255 ? 255 : r);
      }
    }
  }

  vctx.putImageData(vimg, 0, 0);
}
