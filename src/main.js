// ShadowMon — game loop, match flow, menus and rendering.
import { VIEW_H as H, MIN_W, MAX_W, WORLD_W, GROUND_Y, ROUND_TIME, WINS_NEEDED, PROJ, FONT, clamp } from './config.js';
import { Stage } from './stage.js';
import { Fx, initFx } from './fx.js';
import { Fighter, AI } from './fighter.js';
import { Input, Sfx, drawHud, drawControls, uiButton, bigText, slab } from './ui.js';

const NONE = { mx: 0, jump: false, attack: false, heavy: false, special: false, dash: false };
const STEP = 1 / 60;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = 1280; this.px = 1; this.rotated = false;
    this.t = 0; this.acc = 0; this.last = 0; this.speed = 1;
    const snd = new Sfx(), sfx = n => snd.play(n); // callable as G.sfx('hit') and as an object
    sfx.play = sfx; sfx.unlock = () => snd.unlock();
    Object.defineProperty(sfx, 'on', { get: () => snd.on, set: v => { snd.on = v; } });
    this.sfx = sfx;
    this.fx = new Fx();
    this.regions = [];
    this.scene = 'menu';
    this.sel = { kind: 'infernix', level: 'normal' };
    this.paused = false;
    this.demo = location.hash === '#demo';
    initFx();
    this.stage = new Stage();
    this.show = [new Fighter('infernix', 0), new Fighter('aquarion', 1)];
    this.p1 = this.show[0]; this.p2 = this.show[1];
    this.wins = [0, 0]; this.timer = ROUND_TIME; this.cam = WORLD_W / 2 - this.W / 2;
    this.input = new Input(canvas, this);
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.fighting) this.paused = true; });
    this.resize();
    if (this.demo) this.startMatch();
    requestAnimationFrame(ts => this.loop(ts));
  }
  get fighting() { return this.scene === 'match' && !this.paused && (this.phase === 'fight' || this.phase === 'intro' || this.phase === 'ko'); }

  resize() {
    const wrap = this.canvas.parentElement, cw = wrap.clientWidth, ch = wrap.clientHeight;
    const touch = navigator.maxTouchPoints > 0;
    this.rotated = touch && ch > cw * 1.15; // phone held upright: play sideways
    const aw = this.rotated ? ch : cw, ah = this.rotated ? cw : ch;
    this.W = Math.round(clamp((aw / ah) * H, MIN_W, MAX_W));
    const k = Math.min(aw / this.W, ah / H), cssW = this.W * k, cssH = H * k;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.px = Math.min((cssH * dpr) / H, 2);
    this.canvas.width = Math.round(this.W * this.px);
    this.canvas.height = Math.round(H * this.px);
    const st = this.canvas.style;
    st.width = cssW + 'px'; st.height = cssH + 'px';
    st.transform = 'translate(-50%,-50%)' + (this.rotated ? ' rotate(90deg)' : '');
    this.cam = clamp(this.cam, 0, WORLD_W - this.W);
  }

  // ----- match flow -----
  startMatch() {
    const k = this.sel.kind, other = k === 'infernix' ? 'aquarion' : 'infernix';
    this.p1 = new Fighter(k, 0); this.p2 = new Fighter(other, 1);
    this.ai = new AI(this.sel.level);
    this.ai1 = new AI('hard');
    this.wins = [0, 0]; this.round = 1; this.scene = 'match'; this.paused = false;
    this.startRound();
  }
  startRound() {
    this.fx.clear();
    this.p1.reset(WORLD_W / 2 - 250, 1);
    this.p2.reset(WORLD_W / 2 + 250, -1);
    this.timer = ROUND_TIME; this.phase = 'intro'; this.phaseT = 0; this.hitstop = 0;
    this.cam = WORLD_W / 2 - this.W / 2;
    this.input.flush();
    this.sfx.play('bell');
  }
  endRound(w, why) {
    this.phase = 'ko'; this.phaseT = 0; this.why = why; this.roundWinner = w;
    this.fx.flash = why === 'ko' ? 1 : 0.4;
    this.sfx.play('ko');
  }
  toMenu() {
    this.scene = 'menu'; this.paused = false; this.fx.clear();
    this.p1 = this.show[0]; this.p2 = this.show[1]; this.wins = [0, 0];
  }
  onKey(k) {
    if (this.scene === 'menu') {
      if (k === 'left') { this.sel.kind = 'infernix'; this.sfx.play('ui'); }
      if (k === 'right') { this.sel.kind = 'aquarion'; this.sfx.play('ui'); }
      if (k === 'confirm') this.startMatch();
    } else if (this.phase === 'result') {
      if (k === 'confirm') this.startMatch();
    } else if (k === 'pause' || (k === 'confirm' && this.paused)) {
      this.paused = !this.paused; this.sfx.play('ui');
    }
  }
  tap(x, y) {
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const r = this.regions[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { if (r.fn) { this.sfx.play('ui'); r.fn(); } return true; }
    }
    return false;
  }
  projThreat(f) {
    return this.fx.projs.some(p => p.owner !== f && Math.sign(f.x - p.x) === p.dir && Math.abs(f.x - p.x) < 330);
  }
  playerInput() {
    const i = this.input, s = this.p1.state, free = s === 'idle' || s === 'walk' || s === 'block';
    return {
      mx: i.mx,
      jump: free && i.take('jump'),
      attack: (free || s === 'attack' || s === 'jump') && i.take('a'),
      heavy: free && i.take('b'), special: free && i.take('c'), dash: free && i.take('d'),
    };
  }

  step(dt) {
    this.t += dt;
    if (this.scene === 'menu') {
      for (const f of this.show) { f.t += dt; f.stateT += dt; f.state = 'idle'; f.animate(dt); }
      this.fx.update(dt, this.t);
      return;
    }
    if (this.paused) return;
    this.phaseT += dt;
    const { p1, p2, fx } = this;
    if (this.hitstop > 0) { this.hitstop -= dt; fx.update(dt * 0.25, this.t); return; }
    const sdt = dt * (this.phase === 'ko' && this.phaseT < 1 ? 0.3 : 1);
    const live = this.phase === 'fight';
    const i1 = live ? (this.demo ? this.ai1.think(p1, p2, this, sdt) : this.playerInput()) : NONE;
    const i2 = live ? this.ai.think(p2, p1, this, sdt) : NONE;
    if (!live) this.input.flush();
    p1.update(sdt, i1, p2, this);
    p2.update(sdt, i2, p1, this);
    // melee
    for (const [a, b] of [[p1, p2], [p2, p1]]) {
      const hb = a.hitbox();
      if (!hb) continue;
      const hu = b.hurtbox();
      if (hb[0] < hu[1] && hb[1] > hu[0] && hb[2] < hu[3] && hb[3] > hu[2]) { a.hitDone = true; b.takeHit(a.move, a, a.dir, this, a.def.power); }
    }
    // projectiles
    for (const pr of fx.projs) {
      const tg = pr.owner === p1 ? p2 : p1, hu = tg.hurtbox();
      if (pr.x + 26 > hu[0] && pr.x - 26 < hu[1] && pr.y + 30 > hu[2] && pr.y - 30 < hu[3]) {
        if (tg.takeHit(PROJ, pr.owner, pr.dir, this, pr.owner.def.power) !== 'miss') pr.dead = true;
      }
      if (pr.x < this.cam - 120 || pr.x > this.cam + this.W + 120) pr.dead = true;
    }
    // body push
    const dx = p2.x - p1.x;
    if (Math.abs(dx) < 108 && p1.y > -70 && p2.y > -70 && p1.state !== 'ko' && p2.state !== 'ko') {
      const push = (108 - Math.abs(dx)) / 2, s = dx >= 0 ? 1 : -1;
      p1.x -= s * push; p2.x += s * push;
    }
    for (const f of [p1, p2]) f.x = clamp(f.x, Math.max(70, this.cam + 60), Math.min(WORLD_W - 70, this.cam + this.W - 60));
    fx.update(sdt, this.t);
    const target = clamp((p1.x + p2.x) / 2 - this.W / 2, 0, WORLD_W - this.W);
    this.cam += (target - this.cam) * Math.min(1, dt * 6);

    if (this.phase === 'intro' && this.phaseT > 1.6) { this.phase = 'fight'; this.phaseT = 0; }
    else if (this.phase === 'fight') {
      this.timer -= sdt;
      if (p1.hp <= 0 || p2.hp <= 0) this.endRound(p1.hp <= 0 ? (p2.hp <= 0 ? -1 : 1) : 0, 'ko');
      else if (this.timer <= 0) {
        const a = p1.hp / p1.def.hp, b = p2.hp / p2.def.hp;
        this.endRound(a === b ? -1 : a > b ? 0 : 1, 'time');
      }
    } else if (this.phase === 'ko') {
      const w = this.roundWinner, wf = w === 0 ? p1 : w === 1 ? p2 : null;
      if (wf && this.phaseT > 1.3 && (wf.state === 'idle' || wf.state === 'walk' || wf.state === 'block')) { wf.vx = 0; wf.set('win'); }
      if (this.phaseT > 3.4) {
        if (w >= 0) this.wins[w]++;
        if (w >= 0 && this.wins[w] >= WINS_NEEDED) { this.phase = 'result'; this.phaseT = 0; }
        else { if (w >= 0) this.round++; this.startRound(); }
      }
    }
  }

  // ----- rendering -----
  drawWorld(dim) {
    const { ctx, W, t, fx, p1, p2 } = this;
    const sh = fx.shake, sx = sh ? (Math.random() - 0.5) * sh : 0, sy = sh ? (Math.random() - 0.5) * sh : 0;
    ctx.save();
    ctx.translate(sx, sy);
    this.stage.drawBack(ctx, this.cam, W, t);
    ctx.save();
    ctx.translate(-this.cam, 0);
    for (const f of [p1, p2]) {
      const k = clamp(1 + f.y / 420, 0.35, 1);
      ctx.fillStyle = 'rgba(8,4,10,.42)';
      ctx.beginPath(); ctx.ellipse(f.x, GROUND_Y + 3, 78 * k, 11 * k, 0, 0, 7); ctx.fill();
    }
    const order = p1.state === 'attack' ? [p2, p1] : [p1, p2];
    for (const f of order) {
      f.draw(ctx, t, dim && dim !== f);
    }
    fx.draw(ctx, t);
    ctx.restore();
    this.stage.drawFront(ctx, this.cam, W, t);
    ctx.restore();
    if (fx.flash > 0) { ctx.fillStyle = `rgba(255,248,230,${fx.flash * 0.7})`; ctx.fillRect(0, 0, W, H); }
  }
  panel(label) {
    const { ctx, W } = this;
    ctx.fillStyle = 'rgba(10,6,16,.66)'; ctx.fillRect(0, 0, W, H);
    bigText(ctx, label, W / 2, 210, 130, '#fff3d6');
  }
  draw() {
    const { ctx, W, t } = this;
    this.regions = [];
    ctx.setTransform(this.px, 0, 0, this.px, 0, 0);
    if (this.scene === 'menu') return this.drawMenu();
    this.drawWorld();
    drawHud(ctx, this, t);
    if (!this.demo && this.phase !== 'result') drawControls(ctx, this);
    const pt = this.phaseT;
    if (this.phase === 'intro') {
      if (pt < 0.9) bigText(ctx, 'ROUND ' + this.round, W / 2, 300, 120, '#fff3d6', clamp(pt * 5, 0, 1));
      else bigText(ctx, 'FIGHT!', W / 2, 300, 150 + (pt - 0.9) * 30, '#ffb347');
    } else if (this.phase === 'fight' && pt < 0.4) {
      bigText(ctx, 'FIGHT!', W / 2, 300, 171 + pt * 30, '#ffb347', 1 - pt / 0.4);
    } else if (this.phase === 'ko') {
      const txt = this.why === 'ko' ? 'K.O.' : 'TIME UP';
      if (pt < 1.6) bigText(ctx, txt, W / 2, 300, 170, '#ff5a3c', clamp(pt * 6, 0, 1));
      else if (this.roundWinner >= 0) bigText(ctx, (this.roundWinner === 0 ? this.p1 : this.p2).def.name + ' WINS', W / 2, 300, 96, '#fff3d6');
      else bigText(ctx, 'DRAW', W / 2, 300, 120, '#fff3d6');
    } else if (this.phase === 'result') {
      const won = this.wins[0] > this.wins[1];
      this.panel(this.demo ? this.p1.def.name + ' WINS' : won ? 'VICTORY' : 'DEFEAT');
      ctx.font = FONT(34, 500); ctx.textAlign = 'center'; ctx.fillStyle = '#f4e9d8';
      ctx.fillText(`${this.p1.def.name}  ${this.wins[0]} – ${this.wins[1]}  ${this.p2.def.name}`, W / 2, 310);
      uiButton(ctx, this, W / 2 - 140, 370, 280, 68, 'REMATCH', { primary: true, fn: () => this.startMatch() });
      uiButton(ctx, this, W / 2 - 110, 460, 220, 52, 'CHANGE FIGHTER', { size: 28, fn: () => this.toMenu() });
    }
    if (this.paused) {
      this.panel('PAUSED');
      uiButton(ctx, this, W / 2 - 140, 310, 280, 64, 'RESUME', { primary: true, fn: () => (this.paused = false) });
      uiButton(ctx, this, W / 2 - 110, 394, 220, 50, 'RESTART MATCH', { size: 27, fn: () => this.startMatch() });
      uiButton(ctx, this, W / 2 - 110, 458, 220, 50, 'CHANGE FIGHTER', { size: 27, fn: () => this.toMenu() });
      uiButton(ctx, this, W / 2 - 110, 522, 220, 50, 'SOUND: ' + (this.sfx.on ? 'ON' : 'OFF'), { size: 27, fn: () => (this.sfx.on = !this.sfx.on) });
    }
  }
  drawMenu() {
    const { ctx, W, t } = this;
    this.cam = WORLD_W / 2 - W / 2 + Math.sin(t * 0.25) * 60;
    const off = Math.min(340, W / 2 - 150), mid = this.cam + W / 2;
    const [a, b] = this.show;
    a.x = mid - off; a.dir = 1; a.y = 0; b.x = mid + off; b.dir = -1; b.y = 0;
    const selF = this.sel.kind === 'infernix' ? a : b;
    this.drawWorld(selF);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(10,6,16,.72)'); g.addColorStop(0.3, 'rgba(10,6,16,.12)'); g.addColorStop(0.72, 'rgba(10,6,16,.1)'); g.addColorStop(1, 'rgba(10,6,16,.8)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // logo
    ctx.save();
    ctx.translate(W / 2, 96); ctx.transform(1, 0, -0.18, 1, 0, 0);
    ctx.font = FONT(150); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = 22; ctx.strokeStyle = '#120a12'; ctx.strokeText('SHADOWMON', 0, 8);
    const lg = ctx.createLinearGradient(0, -60, 0, 60);
    lg.addColorStop(0, '#fff3d6'); lg.addColorStop(0.55, '#ffb347'); lg.addColorStop(1, '#ff5a3c');
    ctx.fillStyle = lg; ctx.fillText('SHADOWMON', 0, 0);
    ctx.restore();
    ctx.font = FONT(26, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f4e9d8';
    ctx.fillText('C H O O S E   Y O U R   F I G H T E R', W / 2, 186);
    // fighter plates
    for (const f of this.show) {
      const sx = f.x - this.cam, sel = f === selF, d = f.def;
      slab(ctx, sx - 130, 226, 260, 76, 16);
      ctx.fillStyle = sel ? 'rgba(16,12,22,.9)' : 'rgba(16,12,22,.55)'; ctx.fill();
      ctx.lineWidth = sel ? 3 : 1.5; ctx.strokeStyle = sel ? d.color : 'rgba(244,233,216,.4)'; ctx.stroke();
      ctx.font = FONT(44); ctx.fillStyle = sel ? d.color2 : 'rgba(244,233,216,.7)'; ctx.fillText(d.name, sx, 254);
      ctx.font = FONT(20, 500); ctx.fillStyle = 'rgba(244,233,216,.85)'; ctx.fillText(d.blurb, sx, 284);
      ctx.font = FONT(22); ctx.fillStyle = sel ? d.color : 'rgba(244,233,216,.5)';
      ctx.fillText(sel ? '▲ YOU' : 'CPU', sx, GROUND_Y + 44);
      this.regions.push({ x: sx - 140, y: 220, w: 280, h: 380, fn: () => (this.sel.kind = f.kind) });
    }
    // centre column
    bigText(ctx, 'VS', W / 2, 300, 70, '#fff3d6');
    uiButton(ctx, this, W / 2 - 125, 356, 250, 76, 'FIGHT', { primary: true, fn: () => this.startMatch() });
    ['easy', 'normal', 'hard'].forEach((lv, i) => {
      uiButton(ctx, this, W / 2 - 150 + i * 100, 452, 100, 40, lv.toUpperCase(), { size: 24, sk: 10, active: this.sel.level === lv, fn: () => (this.sel.level = lv) });
    });
    ctx.font = FONT(20, 500); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(244,233,216,.8)';
    ctx.fillText(this.input.touch ? 'STICK TO MOVE  ·  UP TO JUMP  ·  HOLD BACK TO BLOCK' : 'A/D MOVE  ·  W JUMP  ·  J ATTACK  ·  K STRIKE  ·  L BLAST  ·  SHIFT DASH  ·  HOLD BACK TO BLOCK  ·  P PAUSE', W / 2, 694);
  }

  loop(ts) {
    const dt = Math.min(0.1, (ts - this.last) / 1000 || 0);
    this.last = ts;
    this.acc += dt * this.speed;
    let n = 0;
    while (this.acc >= STEP && n++ < 240) { this.step(STEP); this.acc -= STEP; }
    this.draw();
    requestAnimationFrame(t2 => this.loop(t2));
  }
}

function boot() {
  window.__shadowmon = new Game(document.getElementById('game'));
}
const fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load(FONT(40)), document.fonts.load(FONT(40, 500))]).catch(() => {}) : Promise.resolve();
Promise.race([fontsReady, new Promise(r => setTimeout(r, 1500))]).then(boot);
