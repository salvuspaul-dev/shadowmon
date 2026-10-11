// Sunset temple stage: pre-painted parallax layers plus live fence, deck, water and foreground.
import { VIEW_H as H, MAX_W, WORLD_W, GROUND_Y, rng } from './config.js';

function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w); c.height = h;
  return [c, c.getContext('2d')];
}
const LW = f => MAX_W + (WORLD_W - MAX_W) * f;

function cloud(g, x, y, s, r) {
  for (let i = 0; i < 9; i++) {
    const ox = (r() - 0.5) * s * 2.4, oy = (r() - 0.5) * s * 0.3, rx = s * (0.35 + r() * 0.5), ry = rx * (0.24 + r() * 0.16);
    const gr = g.createLinearGradient(0, y + oy - ry, 0, y + oy + ry);
    gr.addColorStop(0, 'rgba(255,218,176,.6)');
    gr.addColorStop(1, 'rgba(160,112,170,.22)');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(x + ox, y + oy, rx, ry, 0, 0, 7); g.fill();
  }
}
function pillar(g, x, base, w, h, top, bot, r) {
  const gr = g.createLinearGradient(0, base - h, 0, base);
  gr.addColorStop(0, top); gr.addColorStop(1, bot);
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x - w / 2, base);
  const n = 5;
  for (let i = 1; i <= n; i++) g.lineTo(x - w / 2 + (w * 0.14 * i) / n + (r() - 0.5) * w * 0.12, base - (h * i * 0.9) / n);
  g.quadraticCurveTo(x - w * 0.12, base - h * 1.04, x + (r() - 0.5) * w * 0.1, base - h);
  g.quadraticCurveTo(x + w * 0.22, base - h, x + w * 0.3, base - h * 0.88);
  for (let i = n - 1; i >= 0; i--) g.lineTo(x + w / 2 - (w * 0.14 * i) / n + (r() - 0.5) * w * 0.12, base - (h * i * 0.86) / n);
  g.closePath(); g.fill();
}
function cliff(g, x0, x1, top, base, cTop, cBot, r, green) {
  const gr = g.createLinearGradient(0, top, 0, base);
  gr.addColorStop(0, cTop); gr.addColorStop(1, cBot);
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x0 - 40, base);
  for (let i = 1; i <= 6; i++) g.lineTo(x0 - 40 + (40 * i) / 6 + (r() - 0.5) * 22, base - ((base - top) * i) / 6);
  const n = Math.max(3, Math.round((x1 - x0) / 60));
  for (let i = 1; i <= n; i++) g.lineTo(x0 + ((x1 - x0) * i) / n, top + (r() - 0.5) * 22);
  for (let i = 5; i >= 0; i--) g.lineTo(x1 + 40 - (40 * i) / 6 + (r() - 0.5) * 22, base - ((base - top) * i) / 6);
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(20,20,60,.13)'; g.lineWidth = 3;
  for (let i = 0; i < (x1 - x0) / 34; i++) {
    const x = x0 + r() * (x1 - x0), y = top + 20 + r() * 60;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 16, y + 60 + r() * 140); g.stroke();
  }
  if (green) {
    g.fillStyle = green;
    for (let x = x0 - 10; x < x1 + 10; x += 16 + r() * 18) { g.beginPath(); g.arc(x, top + (r() - 0.5) * 12, 12 + r() * 16, 0, 7); g.fill(); }
  }
}
function pagoda(g, x, base, s, tiers, body, roof, lit) {
  let y = base;
  for (let i = 0; i < tiers; i++) {
    const bw = 74 * s * (1 - i * 0.13), h = 30 * s;
    g.fillStyle = body;
    g.fillRect(x - bw * 0.32, y - h, bw * 0.64, h + 1);
    if (lit) {
      g.fillStyle = 'rgba(255,214,130,.85)';
      g.fillRect(x - bw * 0.16, y - h * 0.7, bw * 0.09, h * 0.45);
      g.fillRect(x + bw * 0.07, y - h * 0.7, bw * 0.09, h * 0.45);
    }
    const ry = y - h, rw = bw * 0.74;
    g.fillStyle = roof;
    g.beginPath();
    g.moveTo(x - rw, ry - 5 * s);
    g.quadraticCurveTo(x - rw * 0.7, ry + 5 * s, x - rw * 0.3, ry + 4 * s);
    g.lineTo(x + rw * 0.3, ry + 4 * s);
    g.quadraticCurveTo(x + rw * 0.7, ry + 5 * s, x + rw, ry - 5 * s);
    g.quadraticCurveTo(x + rw * 0.6, ry - 5 * s, x + rw * 0.4, ry - 14 * s);
    g.lineTo(x - rw * 0.4, ry - 14 * s);
    g.quadraticCurveTo(x - rw * 0.6, ry - 5 * s, x - rw, ry - 5 * s);
    g.fill();
    y = ry - 13 * s;
  }
  g.fillStyle = roof;
  g.fillRect(x - 2 * s, y - 26 * s, 4 * s, 28 * s);
  g.beginPath(); g.arc(x, y - 26 * s, 4 * s, 0, 7); g.fill();
}
function torii(g, x, base, s, col) {
  g.fillStyle = col;
  g.fillRect(x - 34 * s, base - 78 * s, 8 * s, 78 * s);
  g.fillRect(x + 26 * s, base - 78 * s, 8 * s, 78 * s);
  g.fillRect(x - 40 * s, base - 62 * s, 80 * s, 6 * s);
  g.beginPath();
  g.moveTo(x - 54 * s, base - 92 * s);
  g.quadraticCurveTo(x, base - 82 * s, x + 54 * s, base - 92 * s);
  g.lineTo(x + 50 * s, base - 78 * s);
  g.quadraticCurveTo(x, base - 72 * s, x - 50 * s, base - 78 * s);
  g.closePath(); g.fill();
}
function fall(g, x, top, w, h) {
  const gr = g.createLinearGradient(0, top, 0, top + h);
  gr.addColorStop(0, 'rgba(255,255,255,.95)');
  gr.addColorStop(1, 'rgba(205,228,255,.55)');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x - w * 0.4, top); g.lineTo(x + w * 0.4, top); g.lineTo(x + w * 0.62, top + h); g.lineTo(x - w * 0.62, top + h);
  g.closePath(); g.fill();
  const m = g.createRadialGradient(x, top + h, 4, x, top + h, w * 2.4);
  m.addColorStop(0, 'rgba(255,255,255,.75)'); m.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = m;
  g.fillRect(x - w * 3, top + h - w * 2.4, w * 6, w * 4.8);
}
function cherry(g, x, base, s, r, trunk) {
  const tips = [];
  g.strokeStyle = trunk; g.lineCap = 'round';
  const branch = (bx, by, ang, len, wd, d) => {
    const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
    g.lineWidth = wd;
    g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + Math.cos(ang) * len * 0.5 + (r() - 0.5) * 14 * s, by + Math.sin(ang) * len * 0.5, ex, ey); g.stroke();
    if (d <= 0) { tips.push([ex, ey]); return; }
    if (d < 3) tips.push([ex, ey]);
    branch(ex, ey, ang - 0.35 - r() * 0.4, len * 0.74, wd * 0.62, d - 1);
    branch(ex, ey, ang + 0.3 + r() * 0.45, len * 0.72, wd * 0.6, d - 1);
  };
  branch(x, base, -Math.PI / 2 + (r() - 0.5) * 0.3, 96 * s, 17 * s, 4);
  const tones = ['#b84f78', '#d66f97', '#ea92b2', '#f7b9cf'];
  for (let k = 0; k < 4; k++) {
    g.fillStyle = tones[k];
    for (const [tx, ty] of tips) {
      for (let i = 0; i < 3 - (k > 2 ? 2 : 0); i++) {
        g.beginPath();
        g.arc(tx + (r() - 0.5) * 60 * s + k * 5 * s, ty + (r() - 0.5) * 44 * s - k * 6 * s, (26 - k * 5) * s * (0.6 + r() * 0.6), 0, 7);
        g.fill();
      }
    }
  }
}
function haze(g, w, y0, y1, col) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, col.replace('A', '0')); gr.addColorStop(1, col.replace('A', '.6'));
  g.fillStyle = gr; g.fillRect(0, y0, w, y1 - y0);
}

export class Stage {
  constructor() {
    this.layers = [];
    this.falls = [];
    this.petals = [];
    const r0 = rng(99);
    for (let i = 0; i < 46; i++) this.petals.push({ x: r0() * 2000, y: r0() * H, s: 3 + r0() * 5, v: 30 + r0() * 60, ph: r0() * 7, front: r0() < 0.3 });
    this.paint();
  }
  add(f, c) { this.layers.push({ f, c }); }
  paint() {
    // sky
    {
      const w = LW(0.02), [c, g] = mk(w, H), r = rng(7);
      const gr = g.createLinearGradient(0, 0, 0, H * 0.82);
      [[0, '#33427c'], [0.26, '#6f69a8'], [0.5, '#e08f7c'], [0.68, '#ffc086'], [0.86, '#ffe2a8'], [1, '#ffdca2']].forEach(([o, col]) => gr.addColorStop(o, col));
      g.fillStyle = gr; g.fillRect(0, 0, w, H);
      const sx = (this.sunX = w * 0.7), sy = (this.sunY = 255);
      let rg = g.createRadialGradient(sx, sy, 40, sx, sy, 560);
      rg.addColorStop(0, 'rgba(255,238,186,.9)'); rg.addColorStop(0.35, 'rgba(255,204,144,.38)'); rg.addColorStop(1, 'rgba(255,180,120,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, H);
      rg = g.createRadialGradient(sx - 24, sy - 24, 10, sx, sy, 116);
      rg.addColorStop(0, '#fffae2'); rg.addColorStop(1, '#ffe7a6');
      g.fillStyle = rg; g.beginPath(); g.arc(sx, sy, 112, 0, 7); g.fill();
      for (let i = 0; i < 8; i++) cloud(g, r() * w, 20 + r() * 150, 70 + r() * 150, r);
      this.add(0.02, c);
    }
    // far karst pillars
    {
      const w = LW(0.08), [c, g] = mk(w, H), r = rng(11);
      for (let i = 0; i < 18; i++) pillar(g, (i / 17) * w + (r() - 0.5) * 60, 570, 70 + r() * 90, 170 + r() * 230, '#959bd0', '#f3c7b0', r);
      for (let i = 0; i < 11; i++) pillar(g, (i / 10) * w + (r() - 0.5) * 110, 580, 90 + r() * 110, 120 + r() * 170, '#7c84bf', '#e9b6aa', r);
      haze(g, w, 380, 580, 'rgba(255,220,178,A)');
      this.add(0.08, c);
    }
    // temple cliffs
    {
      const f = 0.2, w = LW(f), [c, g] = mk(w, H), r = rng(23), cx = w / 2;
      const T = '#58639e', B = '#c9a4b2', G = '#40607a', body = '#3b4276', roof = '#2a2f5e';
      cliff(g, cx - 930, cx - 650, 320, 610, T, B, r, G);
      torii(g, cx - 790, 316, 0.9, roof);
      cliff(g, cx - 540, cx - 110, 262, 610, T, B, r, G);
      pagoda(g, cx - 450, 262, 0.95, 2, body, roof, true);
      pagoda(g, cx - 320, 258, 1.3, 5, body, roof, true);
      pagoda(g, cx - 195, 262, 0.9, 3, body, roof, true);
      fall(g, cx - 130, 300, 44, 300);
      this.falls.push({ f, x: cx - 130, y: 300, w: 44, h: 300 });
      cliff(g, cx + 70, cx + 340, 318, 610, T, B, r, G);
      pagoda(g, cx + 200, 316, 0.9, 3, body, roof, true);
      fall(g, cx + 84, 350, 28, 250);
      this.falls.push({ f, x: cx + 84, y: 350, w: 28, h: 250 });
      cliff(g, cx + 540, cx + 860, 292, 610, T, B, r, G);
      pagoda(g, cx + 690, 290, 1.05, 4, body, roof, true);
      haze(g, w, 430, 610, 'rgba(255,214,186,A)');
      this.add(f, c);
    }
    // near terraces
    {
      const f = 0.38, w = LW(f), [c, g] = mk(w, H), r = rng(31), cx = w / 2;
      const T = '#3f4a7c', B = '#a08aa9', G = '#31505f', red = '#6b2c3e', dark = '#2a2f58';
      cliff(g, cx - 1080, cx - 620, 372, 620, T, B, r, G);
      torii(g, cx - 800, 368, 1.25, red);
      pagoda(g, cx - 950, 370, 0.9, 2, dark, '#1f2348', true);
      // arched bridge
      g.strokeStyle = dark; g.lineWidth = 12;
      g.beginPath(); g.moveTo(cx - 600, 452); g.quadraticCurveTo(cx - 430, 408, cx - 250, 452); g.stroke();
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(cx - 600, 432); g.quadraticCurveTo(cx - 430, 388, cx - 250, 432); g.stroke();
      for (let i = 0; i <= 8; i++) { const x = cx - 600 + i * 43.75, y = 452 - Math.sin((i / 8) * Math.PI) * 22; g.fillStyle = dark; g.fillRect(x - 2, y - 22, 4, 22); }
      cliff(g, cx - 260, cx - 30, 452, 620, T, B, r, G);
      torii(g, cx - 140, 450, 1.7, red);
      fall(g, cx + 190, 380, 70, 230);
      this.falls.push({ f, x: cx + 190, y: 380, w: 70, h: 230 });
      cliff(g, cx + 250, cx + 300, 400, 620, T, B, r, G);
      cliff(g, cx + 430, cx + 700, 330, 620, T, B, r, G);
      pagoda(g, cx + 565, 328, 1.3, 4, dark, '#1f2348', true);
      cliff(g, cx + 860, cx + 1150, 392, 620, T, B, r, G);
      torii(g, cx + 980, 390, 1.1, red);
      haze(g, w, 470, 620, 'rgba(255,216,196,A)');
      this.add(f, c);
    }
    // blossom trees
    {
      const f = 0.62, w = LW(f), [c, g] = mk(w, H), r = rng(47), cx = w / 2;
      g.fillStyle = '#272b50';
      for (let x = -20; x < w + 20; x += 26 + r() * 30) { g.beginPath(); g.arc(x, 548 + (r() - 0.5) * 16, 26 + r() * 30, 0, 7); g.fill(); }
      g.fillRect(0, 548, w, 200);
      // house with lit windows
      const hx = cx - 900;
      g.fillStyle = '#1d1a2c'; g.fillRect(hx, 430, 190, 130);
      g.beginPath(); g.moveTo(hx - 34, 436); g.quadraticCurveTo(hx + 30, 426, hx + 60, 392); g.lineTo(hx + 130, 392); g.quadraticCurveTo(hx + 160, 426, hx + 224, 436); g.closePath(); g.fill();
      g.fillStyle = '#ffcf7a';
      g.fillRect(hx + 24, 462, 30, 40); g.fillRect(hx + 66, 462, 30, 40); g.fillRect(hx + 130, 462, 30, 40);
      g.fillStyle = '#1d1a2c'; g.fillRect(hx + 38, 462, 2, 40); g.fillRect(hx + 80, 462, 2, 40); g.fillRect(hx + 144, 462, 2, 40);
      const trunk = '#2a1c2a';
      cherry(g, cx - 720, 552, 1.55, r, trunk);
      cherry(g, cx - 440, 556, 0.9, r, trunk);
      cherry(g, cx + 660, 556, 1.0, r, trunk);
      cherry(g, cx + 860, 552, 1.5, r, trunk);
      cherry(g, cx + 1080, 556, 1.2, r, trunk);
      cherry(g, cx - 1010, 556, 1.2, r, trunk);
      haze(g, w, 490, 560, 'rgba(255,226,206,A)');
      this.add(f, c);
    }
    // foreground silhouettes
    {
      const w = MAX_W + 300, [c, g] = mk(w, H), r = rng(61);
      g.fillStyle = '#08070c';
      g.beginPath(); g.moveTo(40, H); g.quadraticCurveTo(70, 380, 30, 0); g.lineTo(120, 0); g.quadraticCurveTo(150, 380, 128, H); g.closePath(); g.fill();
      for (let i = 0; i < 60; i++) { g.beginPath(); g.ellipse(r() * 330 - 30, r() * 150 - 10, 26 + r() * 30, 14 + r() * 14, r() * 3, 0, 7); g.fill(); }
      for (let x = -20; x < w + 20; x += 18 + r() * 22) {
        const edge = Math.min(x, w - x), hgt = 26 + r() * 30 + Math.max(0, 260 - edge) * 0.22;
        g.beginPath(); g.ellipse(x, H + 4, 22 + r() * 22, hgt, (r() - 0.5) * 0.8, 0, 7); g.fill();
      }
      this.fore = c;
    }
  }

  // Background up to and including the fence. cam = world-space left edge of the view.
  drawBack(ctx, cam, W, t) {
    const pad = (MAX_W - W) / 2;
    for (const l of this.layers) {
      const ox = cam * l.f + pad * (1 - l.f);
      ctx.drawImage(l.c, -ox, 0);
      // animated waterfall streaks
      for (const fl of this.falls) {
        if (fl.f !== l.f) continue;
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
          const k = (t * 0.9 + i / 7 + fl.x * 0.01) % 1, sx = fl.x - ox + (((i * 37) % 10) / 10 - 0.5) * fl.w * 0.8;
          ctx.beginPath(); ctx.moveTo(sx, fl.y + k * fl.h); ctx.lineTo(sx, fl.y + k * fl.h + 26); ctx.stroke();
        }
      }
    }
    // sun bloom over everything painted so far
    const sunX = this.sunX - (cam * 0.02 + pad * 0.98);
    ctx.globalCompositeOperation = 'lighter';
    const rg = ctx.createRadialGradient(sunX, this.sunY, 20, sunX, this.sunY, 620);
    rg.addColorStop(0, 'rgba(255,196,128,.3)'); rg.addColorStop(1, 'rgba(255,160,100,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    this.sunScreenX = sunX;
    this.drawPetals(ctx, W, t, false);
    // water under the bridge
    const wy = GROUND_Y + 30;
    const wg = ctx.createLinearGradient(0, wy, 0, H);
    wg.addColorStop(0, '#5a4460'); wg.addColorStop(1, '#17121e');
    ctx.fillStyle = wg; ctx.fillRect(0, wy, W, H - wy);
    ctx.fillStyle = 'rgba(255,190,120,.5)';
    for (let i = 0; i < 16; i++) {
      const y = wy + 12 + i * 9, wd = (30 + i * 14) * (0.7 + 0.3 * Math.sin(t * 2 + i * 1.7));
      ctx.fillRect(sunX - wd / 2 + Math.sin(t * 1.3 + i) * 10, y, wd, 2.5);
    }
    // fence behind the fighters
    const x0 = Math.floor(cam / 170) * 170;
    ctx.fillStyle = '#231614';
    ctx.fillRect(0, GROUND_Y - 84, W, 11);
    ctx.fillRect(0, GROUND_Y - 46, W, 8);
    ctx.fillStyle = 'rgba(255,176,110,.6)';
    ctx.fillRect(0, GROUND_Y - 84, W, 2);
    ctx.fillRect(0, GROUND_Y - 46, W, 1.5);
    for (let x = x0; x < cam + W + 170; x += 170) {
      const sx = x - cam;
      ctx.fillStyle = '#231614'; ctx.fillRect(sx - 8, GROUND_Y - 100, 16, 100);
      ctx.fillRect(sx - 11, GROUND_Y - 104, 22, 7);
      ctx.fillStyle = 'rgba(255,176,110,.6)'; ctx.fillRect(sx - 11, GROUND_Y - 104, 22, 2);
      ctx.fillRect(sx + 6, GROUND_Y - 97, 2, 92);
    }
    // deck
    const dg = ctx.createLinearGradient(0, GROUND_Y - 12, 0, GROUND_Y + 12);
    dg.addColorStop(0, '#7a4f35'); dg.addColorStop(1, '#3a241c');
    ctx.fillStyle = dg; ctx.fillRect(0, GROUND_Y - 12, W, 24);
    ctx.fillStyle = 'rgba(255,196,130,.55)'; ctx.fillRect(0, GROUND_Y - 12, W, 2);
    ctx.strokeStyle = 'rgba(20,10,8,.55)'; ctx.lineWidth = 2;
    const p0 = Math.floor(cam / 58) * 58;
    for (let x = p0; x < cam + W + 58; x += 58) { ctx.beginPath(); ctx.moveTo(x - cam + 6, GROUND_Y - 12); ctx.lineTo(x - cam - 6, GROUND_Y + 12); ctx.stroke(); }
    ctx.fillStyle = '#150d0c'; ctx.fillRect(0, GROUND_Y + 12, W, 26);
    ctx.fillStyle = '#0e0909';
    const b0 = Math.floor(cam / 340) * 340;
    for (let x = b0; x < cam + W + 340; x += 340) ctx.fillRect(x - cam - 14, GROUND_Y + 38, 28, H);
  }
  drawPetals(ctx, W, t, front) {
    ctx.fillStyle = front ? '#ffc4d8' : '#f7a7c2';
    for (const p of this.petals) {
      if (p.front !== front) continue;
      const x = (((p.x - t * p.v * (front ? 1.6 : 1)) % (W + 80)) + W + 80) % (W + 80) - 40;
      const y = (p.y + t * p.v * 0.55 + Math.sin(t * 1.4 + p.ph) * 18) % (H + 20);
      ctx.save();
      ctx.translate(x, y); ctx.rotate(t * 1.8 + p.ph);
      ctx.beginPath(); ctx.ellipse(0, 0, p.s * (front ? 1.5 : 1), p.s * 0.5 * (front ? 1.5 : 1), 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  }
  drawFront(ctx, cam, W, t) {
    const neutral = WORLD_W / 2 - W / 2;
    ctx.drawImage(this.fore, -110 - (cam - neutral) * 0.15, 0);
    this.drawPetals(ctx, W, t, true);
    const vg = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.45, W / 2, H * 0.48, W * 0.75);
    vg.addColorStop(0, 'rgba(10,6,16,0)'); vg.addColorStop(1, 'rgba(10,6,16,.5)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
}
