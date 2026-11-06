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

// Janela desenhada no canvas: a mesma moldura 9-slice das janelas em CSS (src/frame.js)
function drawWindow(c, x, y, w, h, variant) { drawFrame(c, x, y, w, h, variant); }

// Luz da tocha do grupo: forte perto, fraca longe; a cor vem de torchTint (src/uirules.js)
function light(d) { return 1.3 / (1 + d * d * 0.13); }

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
    const sh = light(rd) * fl, tt = torchTint(rd), sr = sh * tt[0], sg = sh * tt[1], sb = sh * tt[2];
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
    const sh = light(perp) * fl * (side ? 0.78 : 1), tt = torchTint(perp);
    const emitS = fl * 1.05;
    const step = 64 / lh;
    const y0 = Math.max(0, ds), y1 = Math.min(VH - 1, de);
    let tp = (y0 - half + lh / 2) * step;
    for (let y = y0; y <= y1; y++) {
      const ti = ((tp | 0) & 63) * 64 + tx; tp += step;
      const em = E[ti], s = em ? (sh > emitS ? sh : emitS) : sh;   // o que brilha sozinho não pega a cor da tocha
      const r = D[ti * 3] * s * (em ? 1 : tt[0]), gg = D[ti * 3 + 1] * s * (em ? 1 : tt[1]), b = D[ti * 3 + 2] * s * (em ? 1 : tt[2]);
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
    const st = o.emit ? [1, 1, 1] : torchTint(tY);
    const xa = Math.max(0, Math.floor(left)), xb = Math.min(VW, Math.ceil(left + sw));
    const ya = Math.max(0, Math.floor(top)), yb = Math.min(VH, Math.ceil(bottom));
    for (let x = xa; x < xb; x++) {
      if (tY >= zbuf[x]) continue;
      const u = Math.floor((x - left) * S.w / sw); if (u < 0 || u >= S.w) continue;
      for (let y = ya; y < yb; y++) {
        const v = Math.floor((y - top) * S.h / sh); if (v < 0 || v >= S.h) continue;
        const i = (v * S.w + u) * 4; if (S.d[i + 3] < 128) continue;
        const r = S.d[i] * shade * st[0], gg = S.d[i + 1] * shade * st[1], b = S.d[i + 2] * shade * st[2];
        vbuf[y * VW + x] = 0xff000000 | ((b > 255 ? 255 : b) << 16) | ((gg > 255 ? 255 : gg) << 8) | (r > 255 ? 255 : r);
      }
    }
  }

  vctx.putImageData(vimg, 0, 0);
}
