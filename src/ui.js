// Input (keyboard + touch), sound effects, HUD and on-screen controls.
import { VIEW_H as H, CHARS, FONT, MOVES, DASH, WINS_NEEDED, clamp } from './config.js';
import { headInfernix, headAquarion } from './rig.js';
import { plume } from './fx.js';

const KEYMAP = {
  KeyJ: 'a', KeyZ: 'a', KeyK: 'b', KeyX: 'b', KeyL: 'c', KeyC: 'c', ShiftLeft: 'd', ShiftRight: 'd', KeyV: 'd',
  KeyW: 'jump', ArrowUp: 'jump', Space: 'jump',
};
const BTN_KEYS = { a: 'J', b: 'K', c: 'L', d: 'SHIFT' };

export class Input {
  constructor(canvas, G) {
    this.G = G; this.canvas = canvas;
    this.keys = new Set(); this.buf = {};
    this.stick = { id: null, x: 0, y: 0, up: false };
    this.held = {}; this.touch = false;
    addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      G.sfx.unlock();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (KEYMAP[e.code]) this.press(KEYMAP[e.code]);
      if (e.code === 'Enter' || e.code === 'Space') G.onKey('confirm');
      if (e.code === 'KeyP' || e.code === 'Escape') G.onKey('pause');
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') G.onKey('left');
      if (e.code === 'ArrowRight' || e.code === 'KeyD') G.onKey('right');
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.stick.id = null; this.stick.x = this.stick.y = 0; this.held = {}; });
    canvas.addEventListener('pointerdown', e => this.down(e));
    canvas.addEventListener('pointermove', e => this.move(e));
    for (const n of ['pointerup', 'pointercancel', 'pointerout']) canvas.addEventListener(n, e => this.up(e));
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }
  press(n) { this.buf[n] = performance.now(); }
  take(n) { const t = this.buf[n]; if (t && performance.now() - t < 150) { this.buf[n] = 0; return true; } return false; }
  flush() { this.buf = {}; }
  get mx() {
    const k = this.keys;
    let v = (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) - (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0);
    if (!v && Math.abs(this.stick.x) > 0.35) v = Math.sign(this.stick.x);
    return v;
  }
  // screen point -> logical game coordinates (handles the rotated portrait layout)
  pos(e) {
    const r = this.canvas.getBoundingClientRect(), G = this.G;
    if (G.rotated) return { x: ((e.clientY - r.top) / r.height) * G.W, y: ((r.right - e.clientX) / r.width) * H };
    return { x: ((e.clientX - r.left) / r.width) * G.W, y: ((e.clientY - r.top) / r.height) * H };
  }
  layout() {
    const W = this.G.W;
    return {
      stick: { x: 141, y: 562, r: 90 },
      a: { x: W - 87, y: 604, r: 65 }, d: { x: W - 225, y: 623, r: 42 },
      b: { x: W - 177, y: 524, r: 42 }, c: { x: W - 96, y: 465, r: 40 },
    };
  }
  down(e) {
    e.preventDefault();
    const G = this.G, p = this.pos(e);
    if (e.pointerType === 'touch') this.touch = true;
    G.sfx.unlock();
    if (G.tap(p.x, p.y)) return;
    if (!G.fighting) return;
    const L = this.layout();
    for (const n of ['a', 'b', 'c', 'd']) {
      const b = L[n];
      if (Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.22) { this.held[n] = e.pointerId; this.press(n); return; }
    }
    if (p.x < G.W * 0.45 && p.y > 250 && this.stick.id === null) {
      this.stick.id = e.pointerId;
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
      this.setStick(p);
    }
  }
  setStick(p) {
    const s = this.layout().stick;
    let x = (p.x - s.x) / 66, y = (p.y - s.y) / 66;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    this.stick.x = x; this.stick.y = y;
    if (y < -0.6 && !this.stick.up) { this.stick.up = true; this.press('jump'); }
    if (y > -0.35) this.stick.up = false;
  }
  move(e) { if (e.pointerId === this.stick.id) this.setStick(this.pos(e)); }
  up(e) {
    if (e.pointerId === this.stick.id) {
      if (e.type === 'pointerout' && e.pointerType !== 'mouse') return;
      this.stick.id = null; this.stick.x = this.stick.y = 0; this.stick.up = false;
    }
    for (const n in this.held) if (this.held[n] === e.pointerId) delete this.held[n];
  }
}

export class Sfx {
  constructor() { this.on = true; this.ctx = null; }
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        const n = this.ctx.sampleRate, b = this.ctx.createBuffer(1, n, n), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        this.nbuf = b;
      } else if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { this.ctx = null; }
  }
  tone(f0, f1, dur, type, vol) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(f0, f1, dur, type, vol) {
    const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    s.buffer = this.nbuf; fl.type = type; fl.Q.value = 1.2;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl).connect(g).connect(c.destination); s.start(t, Math.random() * 0.5, dur + 0.05);
  }
  play(n) {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    try {
      switch (n) {
        case 'swing': this.noise(1400, 500, 0.12, 'bandpass', 0.22); break;
        case 'whoosh': this.noise(500, 2400, 0.22, 'bandpass', 0.28); break;
        case 'hit': this.tone(170, 60, 0.12, 'sine', 0.5); this.noise(2200, 600, 0.08, 'lowpass', 0.35); break;
        case 'heavy': this.tone(120, 38, 0.28, 'sine', 0.7); this.noise(1800, 200, 0.2, 'lowpass', 0.5); break;
        case 'block': this.tone(820, 620, 0.06, 'square', 0.1); this.noise(3000, 2000, 0.06, 'highpass', 0.2); break;
        case 'fire': this.noise(400, 1700, 0.35, 'bandpass', 0.35); this.tone(140, 70, 0.3, 'sawtooth', 0.12); break;
        case 'water': this.noise(2200, 600, 0.32, 'bandpass', 0.35); this.tone(520, 180, 0.25, 'sine', 0.14); break;
        case 'thud': this.tone(95, 40, 0.22, 'sine', 0.6); this.noise(500, 120, 0.15, 'lowpass', 0.3); break;
        case 'jump': this.tone(300, 520, 0.08, 'sine', 0.08); break;
        case 'land': this.noise(400, 150, 0.07, 'lowpass', 0.2); break;
        case 'ko': this.tone(220, 30, 0.9, 'sawtooth', 0.35); this.noise(1200, 80, 0.7, 'lowpass', 0.5); break;
        case 'ui': this.tone(660, 880, 0.06, 'triangle', 0.15); break;
        case 'bell': this.tone(880, 870, 0.7, 'sine', 0.25); this.tone(1320, 1310, 0.5, 'sine', 0.12); break;
      }
    } catch {}
  }
}

// ---------- drawing helpers ----------
export function slab(ctx, x, y, w, h, sk = 14) {
  ctx.beginPath();
  ctx.moveTo(x + sk, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - sk, y + h); ctx.lineTo(x, y + h);
  ctx.closePath();
}
export function bigText(ctx, text, x, y, size, fill, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y); ctx.transform(1, 0, -0.16, 1, 0, 0);
  ctx.font = FONT(size); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.16; ctx.strokeStyle = '#120a12';
  ctx.strokeText(text, 0, size * 0.04);
  ctx.fillStyle = fill; ctx.fillText(text, 0, 0);
  ctx.restore();
}
export function uiButton(ctx, G, x, y, w, h, label, o = {}) {
  slab(ctx, x, y, w, h, o.sk ?? 14);
  ctx.fillStyle = o.primary ? '#ff8a2a' : o.active ? '#f4e9d8' : 'rgba(16,12,22,.82)';
  ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = o.primary ? '#ffe2a8' : 'rgba(244,233,216,.75)'; ctx.stroke();
  ctx.font = FONT(o.size || h * 0.62); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = o.primary || o.active ? '#17101a' : '#f4e9d8';
  ctx.fillText(label, x + w / 2, y + h / 2 + (o.size || h * 0.62) * 0.07);
  G.regions.push({ x, y, w, h, fn: o.fn });
}

function glyph(ctx, n, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = ctx.fillStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (n === 'a') { // claw marks
    ctx.lineWidth = s * 0.16;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.45 + i * s * 0.3, -s * 0.55); ctx.quadraticCurveTo(i * s * 0.3 + s * 0.2, -s * 0.1, -s * 0.15 + i * s * 0.3, s * 0.6); ctx.stroke(); }
  } else if (n === 'b') { // crescent strike
    ctx.beginPath(); ctx.arc(-s * 0.15, 0, s * 0.65, -1.2, 1.2); ctx.arc(-s * 0.5, 0, s * 0.6, 1, -1, true); ctx.closePath(); ctx.fill();
  } else if (n === 'c') { // orb with speed lines
    ctx.beginPath(); ctx.arc(s * 0.2, 0, s * 0.3, 0, 7); ctx.fill();
    ctx.lineWidth = s * 0.12;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.65, i * s * 0.3); ctx.lineTo(-s * 0.2 - Math.abs(i) * s * 0.1, i * s * 0.3); ctx.stroke(); }
  } else { // dash chevrons
    ctx.lineWidth = s * 0.18;
    for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.45 + i * s * 0.5, -s * 0.45); ctx.lineTo(i * s * 0.5, 0); ctx.lineTo(-s * 0.45 + i * s * 0.5, s * 0.45); ctx.stroke(); }
  }
  ctx.restore();
}

export function portrait(ctx, kind, x, y, r, t, flip) {
  const d = CHARS[kind];
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
  const g = ctx.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, d.color2); g.addColorStop(1, d.color);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.translate(x + (flip ? 12 : -12), y + r * 0.3); ctx.scale(flip ? -r / 48 : r / 48, r / 48);
  (kind === 'infernix' ? headInfernix : headAquarion)(ctx, t, d.pal, false);
  ctx.restore();
  ctx.lineWidth = 5; ctx.strokeStyle = '#120d18'; ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,240,220,.7)'; ctx.beginPath(); ctx.arc(x, y, r - 4, 0, 7); ctx.stroke();
  ctx.restore();
}

function hudSide(ctx, G, f, right, t) {
  const W = G.W, X = x => (right ? W - x : x), d = f.def;
  const b0 = 124, b1 = W / 2 - 74, y = 40, h = 20, bw = b1 - b0;
  // frame
  ctx.beginPath();
  ctx.moveTo(X(b0 - 8), y - 5); ctx.lineTo(X(b1 + 14), y - 5); ctx.lineTo(X(b1 - 4), y + h + 5); ctx.lineTo(X(b0 - 8), y + h + 5);
  ctx.closePath(); ctx.fillStyle = 'rgba(14,10,20,.88)'; ctx.fill();
  // health: remaining health hugs the centre
  const bar = (ratio, col) => {
    const x0 = b1 - bw * ratio;
    ctx.beginPath();
    ctx.moveTo(X(x0), y); ctx.lineTo(X(b1 + 8), y); ctx.lineTo(X(b1 - 4), y + h); ctx.lineTo(X(x0), y + h);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  };
  const hr = clamp(f.hp / d.hp, 0, 1), lr = clamp(f.lagHp / d.hp, 0, 1);
  if (lr > hr) bar(lr, '#e23b2e');
  if (hr > 0) {
    bar(hr, hr > 0.5 ? '#6ed34a' : hr > 0.25 ? '#f6c53a' : '#ef5a3c');
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    const x0 = b1 - bw * hr; ctx.fillRect(Math.min(X(x0), X(b1)), y, Math.abs(X(b1) - X(x0)), 5);
  }
  // energy, anchored to the portrait side
  const ew = bw * 0.6, ey = y + h + 9;
  ctx.fillStyle = 'rgba(14,10,20,.88)';
  ctx.beginPath(); ctx.moveTo(X(b0 - 8), ey - 3); ctx.lineTo(X(b0 + ew + 12), ey - 3); ctx.lineTo(X(b0 + ew + 2), ey + 11); ctx.lineTo(X(b0 - 8), ey + 11); ctx.closePath(); ctx.fill();
  const er = f.energy / 100;
  ctx.fillStyle = '#ffa23a';
  ctx.beginPath(); ctx.moveTo(X(b0), ey); ctx.lineTo(X(b0 + ew * er + 6), ey); ctx.lineTo(X(b0 + ew * er), ey + 8); ctx.lineTo(X(b0), ey + 8); ctx.closePath(); ctx.fill();
  // name
  ctx.font = FONT(30); ctx.textBaseline = 'alphabetic'; ctx.textAlign = right ? 'right' : 'left';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(14,10,20,.85)'; ctx.lineJoin = 'round';
  ctx.strokeText(d.name, X(b0 + 82), y - 9); ctx.fillStyle = '#fff6e6'; ctx.fillText(d.name, X(b0 + 82), y - 9);
  // round wins
  for (let i = 0; i < WINS_NEEDED; i++) {
    const px = X(b1 - 14 - i * 22), py = ey + 5;
    ctx.beginPath(); ctx.moveTo(px, py - 8); ctx.lineTo(px + 8, py); ctx.lineTo(px, py + 8); ctx.lineTo(px - 8, py); ctx.closePath();
    ctx.fillStyle = G.wins[right ? 1 : 0] > i ? '#ffd166' : 'rgba(14,10,20,.8)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,240,220,.7)'; ctx.stroke();
  }
  // skill icons
  const ready = [f.canPay('special'), f.canPay('heavy'), f.dashCd <= 0];
  ['c', 'b', 'd'].forEach((n, i) => {
    const ix = X(b0 + 22 + i * 44), iy = 104;
    ctx.beginPath(); ctx.arc(ix, iy, 17, 0, 7);
    ctx.fillStyle = 'rgba(14,10,20,.88)'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = ready[i] ? d.color : 'rgba(255,255,255,.25)'; ctx.stroke();
    ctx.save(); ctx.globalAlpha = ready[i] ? 1 : 0.3;
    if (right) { ctx.translate(ix, 0); ctx.scale(-1, 1); ctx.translate(-ix, 0); }
    glyph(ctx, n, ix, iy, 13); ctx.restore();
  });
  // portrait + element badge
  portrait(ctx, f.kind, X(62), 60, 50, t, right);
  ctx.beginPath(); ctx.arc(X(26), 104, 15, 0, 7); ctx.fillStyle = '#120d18'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = d.color; ctx.stroke();
  plume(ctx, d.element, X(26), 111, -Math.PI / 2, 20, 13, t, 2);
  // combo counter
  if (f.combo > 1) {
    bigText(ctx, f.combo + ' HITS', X(150), 190, 46, d.color2, clamp(f.comboT * 2, 0, 1));
  }
}

export function drawHud(ctx, G, t) {
  const W = G.W;
  hudSide(ctx, G, G.p1, false, t);
  hudSide(ctx, G, G.p2, true, t);
  // timer badge
  const cx = W / 2, cy = 54;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 40 : i % 4 === 0 ? 62 : 50; ctx.lineTo(cx + Math.cos(a) * r * 1.12, cy + Math.sin(a) * r * 0.9); }
  ctx.closePath(); ctx.fillStyle = '#16111d'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, 37, 0, 7); ctx.fillStyle = '#231b2c'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,240,220,.35)'; ctx.stroke();
  ctx.font = FONT(56); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tm = Math.max(0, Math.ceil(G.timer));
  ctx.fillStyle = tm <= 10 ? '#ff6a4a' : '#fff'; ctx.fillText(String(tm), cx, cy + 5);
  // pause
  ctx.beginPath(); ctx.arc(cx, 118, 19, 0, 7); ctx.fillStyle = 'rgba(22,17,29,.9)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,240,220,.6)'; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillRect(cx - 7, 110, 5, 16); ctx.fillRect(cx + 2, 110, 5, 16);
  G.regions.push({ x: cx - 26, y: 92, w: 52, h: 52, fn: () => G.onKey('pause') });
}

export function drawControls(ctx, G) {
  const inp = G.input, L = inp.layout(), p = G.p1, s = L.stick;
  ctx.save();
  // joystick
  ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7);
  ctx.fillStyle = 'rgba(18,14,24,.38)'; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (let i = 0; i < 4; i++) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate((i * Math.PI) / 2);
    ctx.beginPath(); ctx.moveTo(s.r - 8, 0); ctx.lineTo(s.r - 20, -8); ctx.lineTo(s.r - 20, 8); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  const kx = s.x + inp.stick.x * 46 + (inp.stick.id === null ? inp.mx * 30 : 0), ky = s.y + inp.stick.y * 46;
  const kg = ctx.createRadialGradient(kx - 8, ky - 8, 4, kx, ky, 42);
  kg.addColorStop(0, 'rgba(230,230,235,.85)'); kg.addColorStop(1, 'rgba(120,120,130,.7)');
  ctx.beginPath(); ctx.arc(kx, ky, 40, 0, 7); ctx.fillStyle = kg; ctx.fill();
  // buttons
  const ok = { a: true, b: p.canPay('heavy'), c: p.canPay('special'), d: p.dashCd <= 0 };
  for (const n of ['a', 'b', 'c', 'd']) {
    const b = L[n], down = n in inp.held;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (down ? 0.94 : 1), 0, 7);
    ctx.fillStyle = down ? 'rgba(255,255,255,.3)' : 'rgba(18,14,24,.5)'; ctx.fill();
    ctx.lineWidth = 3.5; ctx.strokeStyle = ok[n] ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.3)'; ctx.stroke();
    ctx.globalAlpha = ok[n] ? 0.95 : 0.3;
    glyph(ctx, n, b.x, b.y, b.r * 0.62);
    ctx.globalAlpha = 1;
    if (n === 'd' && p.dashCd > 0) {
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + (p.dashCd / DASH.cd) * Math.PI * 2); ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fill();
    }
    if (!inp.touch) {
      ctx.font = FONT(18); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(BTN_KEYS[n], b.x, b.y + b.r + 12);
    }
  }
  ctx.restore();
}
export { MOVES };
