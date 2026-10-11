// Particles, slashes, hit sparks, projectiles and screen shake.
import { GROUND_Y, PROJ, clamp } from './config.js';

const sprites = {};
function glow(name, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  sprites[name] = c;
}
export function initFx() {
  glow('fire', [[0, 'rgba(255,250,220,1)'], [0.25, 'rgba(255,200,80,.9)'], [0.6, 'rgba(255,90,20,.45)'], [1, 'rgba(255,40,0,0)']]);
  glow('water', [[0, 'rgba(240,255,255,1)'], [0.3, 'rgba(120,220,255,.85)'], [0.65, 'rgba(40,120,255,.4)'], [1, 'rgba(20,60,255,0)']]);
  glow('white', [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,245,220,.6)'], [1, 'rgba(255,240,200,0)']]);
  glow('dust', [[0, 'rgba(70,52,44,.55)'], [1, 'rgba(70,52,44,0)']]);
}
export const sprite = n => sprites[n];
const PAL = {
  fire: ['#ff3b1f', '#ff8a1f', '#ffd84a', '#fff6c9'],
  water: ['#1f6fe0', '#3fb0ff', '#9fe8ff', '#f2ffff'],
};

// Solid layered teardrop pointing along +x after rotation. Used for flames and water plumes.
export function plume(ctx, el, x, y, ang, len, w, t, seed = 0) {
  const cols = PAL[el];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const sizes = [[1, 1], [0.78, 0.74], [0.52, 0.5], [0.28, 0.28]];
  for (let i = 0; i < 4; i++) {
    const wob = Math.sin(t * 11 + seed + i) * w * 0.22;
    const l = len * sizes[i][0] + Math.sin(t * 17 + seed * 2.3) * len * 0.08;
    const hw = (w * sizes[i][1]) / 2;
    ctx.beginPath();
    ctx.moveTo(0, -hw);
    ctx.quadraticCurveTo(l * 0.45, -hw * 1.25 + wob * 0.4, l, wob);
    ctx.quadraticCurveTo(l * 0.45, hw * 1.25 + wob * 0.4, 0, hw);
    ctx.arc(0, 0, hw, Math.PI / 2, -Math.PI / 2);
    ctx.fillStyle = cols[i];
    ctx.fill();
  }
  ctx.restore();
}

export class Fx {
  constructor() { this.clear(); }
  clear() {
    this.parts = [];
    this.slashes = [];
    this.sparks = [];
    this.projs = [];
    this.shake = 0;
    this.flash = 0;
  }
  p(o) {
    if (this.parts.length > 420) this.parts.shift();
    this.parts.push({ vx: 0, vy: 0, g: 0, drag: 0, s0: 20, s1: 0, add: true, sprite: 'fire', life: 0, max: 0.4, rot: 0, vr: 0, ...o });
  }
  burst(el, x, y, n, speed, dirX = 0) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.9);
      this.p({ sprite: el, x, y, vx: Math.cos(a) * v + dirX * speed * 0.6, vy: Math.sin(a) * v - 60, g: el === 'water' ? 900 : -120, drag: 2.2, s0: 14 + Math.random() * 26, max: 0.25 + Math.random() * 0.35 });
    }
  }
  shards(x, y, n, dirX, col = '#1a1014') {
    for (let i = 0; i < n; i++) {
      this.p({ shape: 'shard', col, add: false, x, y, vx: dirX * (120 + Math.random() * 420) + (Math.random() - 0.5) * 260, vy: -Math.random() * 520, g: 1700, s0: 4 + Math.random() * 7, s1: 2, max: 0.5 + Math.random() * 0.4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20 });
    }
  }
  dust(x, n = 6) {
    for (let i = 0; i < n; i++) {
      this.p({ sprite: 'dust', add: false, x: x + (Math.random() - 0.5) * 50, y: GROUND_Y - 4, vx: (Math.random() - 0.5) * 220, vy: -30 - Math.random() * 70, drag: 3, s0: 26, s1: 70, max: 0.45 + Math.random() * 0.3 });
    }
  }
  trail(el, x, y, vx = 0, vy = 0, size = 22) {
    this.p({ sprite: el, x: x + (Math.random() - 0.5) * 12, y: y + (Math.random() - 0.5) * 12, vx: vx + (Math.random() - 0.5) * 60, vy: vy + (el === 'fire' ? -70 : 30) + (Math.random() - 0.5) * 60, g: el === 'water' ? 500 : -160, drag: 2, s0: size * (0.6 + Math.random() * 0.7), max: 0.22 + Math.random() * 0.28 });
  }
  slash(el, x, y, dir, size, rot = 0, max = 0.26) {
    this.slashes.push({ el, x, y, dir, size, rot, life: 0, max });
  }
  spark(x, y, el, big) {
    const rays = [];
    const n = big ? 14 : 9;
    for (let i = 0; i < n; i++) rays.push([Math.random() * Math.PI * 2, 0.5 + Math.random() * 0.8]);
    this.sparks.push({ x, y, el, rays, life: 0, max: big ? 0.3 : 0.2, size: big ? 150 : 90 });
    this.burst(el, x, y, big ? 16 : 8, big ? 520 : 340);
    this.p({ sprite: 'white', x, y, s0: big ? 220 : 130, s1: 20, max: 0.12 });
  }
  shoot(owner, el, x, y, dir) {
    this.projs.push({ owner, el, x, y, dir, vx: dir * PROJ.speed, life: 0, dead: false });
  }
  addShake(v) { this.shake = Math.max(this.shake, v); }

  update(dt, t) {
    for (const p of this.parts) {
      p.life += dt;
      p.vy += p.g * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.shape === 'shard' && p.y > GROUND_Y) { p.y = GROUND_Y; p.vy *= -0.3; p.vx *= 0.5; }
    }
    this.parts = this.parts.filter(p => p.life < p.max);
    for (const s of this.slashes) s.life += dt;
    this.slashes = this.slashes.filter(s => s.life < s.max);
    for (const s of this.sparks) s.life += dt;
    this.sparks = this.sparks.filter(s => s.life < s.max);
    for (const pr of this.projs) {
      pr.life += dt;
      pr.x += pr.vx * dt;
      if (pr.life > PROJ.life) pr.dead = true;
      this.trail(pr.el, pr.x - pr.dir * 18, pr.y, -pr.vx * 0.15, 0, 30);
    }
    // projectiles cancel each other out
    for (let i = 0; i < this.projs.length; i++) {
      for (let j = i + 1; j < this.projs.length; j++) {
        const a = this.projs[i], b = this.projs[j];
        if (!a.dead && !b.dead && a.owner !== b.owner && Math.abs(a.x - b.x) < 46 && Math.abs(a.y - b.y) < 60) {
          a.dead = b.dead = true;
          this.spark((a.x + b.x) / 2, a.y, a.el, true);
          this.burst(b.el, (a.x + b.x) / 2, a.y, 14, 420);
          this.addShake(8);
        }
      }
    }
    this.projs = this.projs.filter(p => !p.dead);
    this.shake = Math.max(0, this.shake - dt * 60);
    this.flash = Math.max(0, this.flash - dt * 3.2);
  }

  draw(ctx, t) {
    // projectiles
    for (const pr of this.projs) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = sprite(pr.el);
      ctx.drawImage(g, pr.x - 70, pr.y - 70, 140, 140);
      ctx.globalCompositeOperation = 'source-over';
      plume(ctx, pr.el, pr.x + pr.dir * 16, pr.y, pr.dir > 0 ? Math.PI : 0, 92, 46, t, pr.life * 3);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(sprite('white'), pr.x + pr.dir * 8 - 26, pr.y - 26, 52, 52);
      ctx.restore();
    }
    // slashes
    for (const s of this.slashes) {
      const k = s.life / s.max, cols = PAL[s.el];
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(s.dir, 1);
      ctx.rotate(s.rot);
      const R = s.size * (0.75 + k * 0.45);
      ctx.globalAlpha = clamp(1.25 - k * 1.25, 0, 1);
      const lay = [[1, cols[0]], [0.9, cols[1]], [0.78, cols[2]], [0.62, cols[3]]];
      for (const [m, col] of lay) {
        const r = R * m, sw = 1.25 - k * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, r, -sw, sw);
        ctx.arc(-r * 0.42 * (0.6 + m * 0.4), 0, r * 0.92, sw * 0.82, -sw * 0.82, true);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
      }
      ctx.restore();
    }
    // particles
    for (const p of this.parts) {
      const k = p.life / p.max, s = p.s0 + (p.s1 - p.s0) * k;
      if (s <= 0) continue;
      if (p.shape === 'shard') {
        ctx.save();
        ctx.globalAlpha = 1 - k * k;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.moveTo(-s, -s * 0.5); ctx.lineTo(s, 0); ctx.lineTo(-s * 0.4, s * 0.7); ctx.closePath(); ctx.fill();
        ctx.restore();
        continue;
      }
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      ctx.globalAlpha = 1 - k;
      ctx.drawImage(sprite(p.sprite), p.x - s, p.y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    // sparks
    for (const s of this.sparks) {
      const k = s.life / s.max;
      ctx.strokeStyle = s.el === 'fire' ? '#ffe9a8' : '#dff8ff';
      ctx.lineCap = 'round';
      for (const [a, m] of s.rays) {
        const r0 = s.size * (0.15 + k * 0.5) * m, r1 = s.size * (0.45 + k * 0.75) * m;
        ctx.lineWidth = 5 * (1 - k) + 1;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0);
        ctx.lineTo(s.x + Math.cos(a) * r1, s.y + Math.sin(a) * r1);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
