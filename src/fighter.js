// Fighter state machine, hit handling and the CPU opponent.
import { CHARS, MOVES, DASH, PROJ, LEVELS, GROUND_Y, GRAVITY, WORLD_W, clamp } from './config.js';
import { ANIMS, JUMP, SCALE, sample, solve, lerpPose, drawCreature, flatPal } from './rig.js';

const FREE = { idle: 1, walk: 1, block: 1 };
const WHITE = flatPal('#ffffff');
const SHADOW = flatPal('#120d18');

export class Fighter {
  constructor(kind, side) {
    this.kind = kind;
    this.def = CHARS[kind];
    this.side = side;
    this.ghostPal = flatPal(this.def.color);
    this.reset(0, 1);
  }
  reset(x, dir) {
    Object.assign(this, {
      x, y: 0, vx: 0, vy: 0, dir, hp: this.def.hp, lagHp: this.def.hp, energy: 30, state: 'idle', stateT: 0, t: Math.random() * 3,
      move: null, moveT: 0, hitDone: false, queued: false, fired: false, slashed: false, airUsed: false, dashCd: 0, dashDir: 1,
      stun: 0, flashT: 0, combo: 0, comboT: 0, animT: 0, anim: 'idle', pose: null, from: null, blendT: 1, ghosts: [], inp: null,
    });
    this.pose = sample(ANIMS.idle, 0);
    this.J = solve(this.pose, this.kind, 0);
  }
  set(state) { this.state = state; this.stateT = 0; }
  get grounded() { return this.y >= 0; }
  get invuln() {
    if (this.state === 'down' || this.state === 'getup' || this.state === 'ko' || this.state === 'knock' && this.stateT > 0.5) return true;
    return this.state === 'dash' && this.stateT > DASH.inv[0] && this.stateT < DASH.inv[1];
  }
  hurtbox() { return [this.x - 42, this.x + 42, GROUND_Y + this.y - 200, GROUND_Y + this.y]; }
  hitbox() {
    const m = this.move;
    if (this.state !== 'attack' || !m || !m.act || this.hitDone || this.moveT < m.act[0] || this.moveT > m.act[1]) return null;
    const b = m.box, r = this.def.reach, xa = this.x + this.dir * b[0], xb = this.x + this.dir * b[1] * r;
    return [Math.min(xa, xb), Math.max(xa, xb), GROUND_Y + this.y + b[2], GROUND_Y + this.y + b[3]];
  }
  // Is this fighter currently a danger to `o` (used for blocking stance and AI)?
  threat(o) {
    return this.state === 'attack' && this.move.act && this.moveT < this.move.act[1] && Math.abs(o.x - this.x) < 300;
  }
  canPay(name) { return this.energy >= (MOVES[name].cost || 0); }
  start(name) {
    const m = MOVES[name];
    this.energy -= m.cost || 0;
    this.move = m; this.moveT = 0; this.hitDone = false; this.queued = false; this.fired = false; this.slashed = false;
    this._arc = false;
    this.set('attack');
    if (m.step && this.grounded) this.vx = this.dir * m.step;
  }

  update(dt, inp, opp, G) {
    this.inp = inp;
    this.t += dt; this.stateT += dt;
    this.energy = Math.min(100, this.energy + 4 * dt);
    this.dashCd -= dt; this.flashT -= dt;
    if ((this.comboT -= dt) <= 0) this.combo = 0;
    this.lagHp += (this.hp - this.lagHp) * Math.min(1, dt * 3.5);
    const fx = G.fx, el = this.def.element;
    const s = this.state;

    if (FREE[s]) {
      this.dir = opp.x >= this.x ? 1 : -1;
      if (inp.dash && this.dashCd <= 0) {
        this.dashDir = inp.mx || this.dir; this.dashCd = DASH.cd; this.set('dash'); fx.dust(this.x, 5); G.sfx('whoosh');
      } else if (inp.special && this.canPay('special')) this.start('special');
      else if (inp.heavy && this.canPay('heavy')) { this.start('heavy'); G.sfx('whoosh'); }
      else if (inp.attack) { this.start('light1'); G.sfx('swing'); }
      else if (inp.jump) { this.vy = -this.def.jump; this.y = -1; this.vx = inp.mx * this.def.speed * 0.9; this.airUsed = false; this.set('jump'); G.sfx('jump'); }
      else if (inp.mx) {
        const back = inp.mx === -this.dir;
        if (back && (opp.threat(this) || G.projThreat(this))) { this.vx = 0; if (s !== 'block') this.set('block'); }
        else { this.vx = inp.mx * this.def.speed * (back ? 0.78 : 1); if (s !== 'walk') this.set('walk'); this.animT += dt * (back ? -1 : 1); }
      } else { this.vx *= Math.max(0, 1 - 14 * dt); if (s !== 'idle') this.set('idle'); }
    } else if (s === 'jump') {
      this.vx += inp.mx * 900 * dt;
      this.vx = clamp(this.vx, -this.def.speed, this.def.speed);
      if (inp.attack && !this.airUsed) { this.airUsed = true; this.start('air'); G.sfx('swing'); }
    } else if (s === 'attack') {
      const m = this.move;
      this.moveT += dt;
      if (inp.attack) this.queued = true;
      if (this.grounded) {
        if (m.lunge && this.moveT > m.lunge[0] && this.moveT < m.lunge[1]) {
          this.vx = this.dir * m.lunge[2];
          fx.trail(el, this.x - this.dir * 20, GROUND_Y - 110 + Math.random() * 60, -this.dir * 200, 0, 34);
        } else this.vx *= Math.max(0, 1 - 9 * dt);
      }
      if (m.slash && !this.slashed && this.moveT >= m.act[0]) {
        this.slashed = true;
        fx.slash(el, this.x + this.dir * 95, GROUND_Y + this.y - 135, this.dir, 150 * this.def.reach, 0.25, 0.3);
        G.sfx(el);
      }
      if (m.act && !this.slashed && !m.slash && this.moveT >= m.act[0] && !this._arc) {
        this._arc = true;
        fx.slash(el, this.x + this.dir * (m === MOVES.air ? 60 : 85), GROUND_Y + this.y + (m.glow === 'L' ? -120 : -165), this.dir, m.heavy ? 96 : 66, m === MOVES.air ? 0.7 : m.glow === 'L' ? -0.2 : 0.1, 0.18);
      }
      if (m.fire && !this.fired && this.moveT >= m.fire) {
        this.fired = true;
        fx.shoot(this, el, this.x + this.dir * 95, GROUND_Y - 150, this.dir);
        fx.burst(el, this.x + this.dir * 95, GROUND_Y - 150, 10, 300, this.dir);
        G.sfx(el);
      }
      if (m.next && this.queued && this.moveT >= m.cancel) { this._arc = false; this.start(m.next); G.sfx('swing'); }
      else if (this.moveT >= m.dur) { this._arc = false; this.move = null; this.set(this.grounded ? 'idle' : 'jump'); }
    } else if (s === 'dash') {
      this.vx = this.dashDir * DASH.speed;
      if (this.stateT > DASH.dur) { this.vx *= 0.3; this.set('idle'); }
    } else if (s === 'hit') {
      this.vx *= Math.max(0, 1 - 7 * dt);
      if (this.stateT > this.stun) this.set('idle');
    } else if (s === 'blockstun') {
      this.vx *= Math.max(0, 1 - 8 * dt);
      if (this.stateT > this.stun) this.set('idle');
    } else if (s === 'down') {
      this.vx *= Math.max(0, 1 - 8 * dt);
      if (this.stateT > 0.65 && this.hp > 0) this.set('getup');
    } else if (s === 'getup') {
      if (this.stateT > 0.4) this.set('idle');
    } else if (s === 'win' || s === 'ko') {
      this.vx *= Math.max(0, 1 - 8 * dt);
    }

    // physics
    if (!this.grounded || this.vy < 0) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y >= 0) {
        this.y = 0; this.vy = 0;
        fx.dust(this.x, 5);
        if (this.state === 'knock') { this.set(this.hp > 0 ? 'down' : 'ko'); fx.addShake(9); fx.dust(this.x, 10); G.sfx('thud'); }
        else if (this.state === 'jump' || this.state === 'attack') { this.move = null; this._arc = false; this.set('idle'); G.sfx('land'); }
      }
    }
    this.x = clamp(this.x + this.vx * dt, 70, WORLD_W - 70);

    // ghosts while dashing or lunging
    if (this.state === 'dash' || (this.move && this.move.lunge && this.moveT < this.move.lunge[1])) {
      if (!this.ghosts.length || this.ghosts[this.ghosts.length - 1].a < 0.82) this.ghosts.push({ x: this.x, y: this.y, dir: this.dir, J: this.J, pose: this.pose, a: 1 });
    }
    for (const g of this.ghosts) g.a -= dt * 4.5;
    this.ghosts = this.ghosts.filter(g => g.a > 0);

    // ambient element particles
    if (this.kind === 'infernix' && Math.random() < 0.5) {
      const tip = this.J.tail[4];
      fx.trail('fire', this.x + this.dir * tip.x * SCALE, GROUND_Y + this.y + tip.y * SCALE - 20, 0, -40, 12);
    }
    this.animate(dt);
  }

  animate(dt) {
    const s = this.state;
    let name = s, at = this.stateT, target;
    if (s === 'attack') { name = this.move.anim; at = this.moveT; }
    else if (s === 'walk') at = this.animT;
    else if (s === 'idle' || s === 'win') at = this.t;
    else if (s === 'blockstun') name = 'block';
    else if (s === 'ko') name = 'down';
    if (s === 'jump') target = lerpPose(JUMP[0], JUMP[1], clamp((this.vy + 500) / 1100, 0, 1));
    else target = sample(ANIMS[name], at);
    if (name !== this.anim) { this.anim = name; this.from = this.pose; this.blendT = 0; }
    this.blendT += dt / 0.07;
    this.pose = this.blendT < 1 && this.from ? lerpPose(this.from, target, this.blendT) : target;
    this.J = solve(this.pose, this.kind, this.t);
  }

  // Returns 'miss' | 'block' | 'hit'.
  takeHit(m, atk, dir, G, power = 1) {
    if (this.invuln) return 'miss';
    const fx = G.fx, el = atk.def.element;
    const holdBack = !!this.inp && this.inp.mx === dir; // holding away from the attacker
    const cy = GROUND_Y + this.y - 130, cx = this.x - dir * 30;
    if (holdBack && (this.grounded && FREE[this.state] || this.state === 'blockstun')) {
      this.hp = Math.max(1, this.hp - m.dmg * power * 0.12);
      this.stun = 0.2; this.vx = dir * 260; this.set('blockstun');
      fx.spark(cx, cy, el, false); fx.addShake(4);
      G.sfx('block');
      this.energy = Math.min(100, this.energy + 3);
      return 'block';
    }
    const dmg = m.dmg * power;
    this.hp = Math.max(0, this.hp - dmg);
    this.energy = Math.min(100, this.energy + dmg * 0.07);
    atk.energy = Math.min(100, atk.energy + dmg * 0.11);
    atk.combo = atk.comboT > 0 ? atk.combo + 1 : 1; atk.comboT = 1.1;
    this.flashT = 0.07; this.move = null; this._arc = false;
    this.vx = dir * m.kb;
    if (m.launch || !this.grounded || this.hp <= 0) {
      this.vy = -(m.launch || 420); this.y = Math.min(this.y, -1);
      if (this.hp <= 0) { this.vy = -620; this.vx = dir * 520; }
      this.set('knock');
    } else { this.stun = m.stun; this.set('hit'); }
    fx.spark(cx, cy, el, !!m.heavy || this.hp <= 0);
    fx.shards(cx, cy, m.heavy ? 12 : 6, dir);
    fx.addShake(m.heavy ? 14 : 7);
    G.hitstop = m.heavy ? 0.1 : 0.055;
    G.sfx(m.heavy ? 'heavy' : 'hit');
    return 'hit';
  }

  draw(ctx, t, shadow) {
    const d = this.def;
    for (const g of this.ghosts) {
      ctx.save();
      ctx.globalAlpha = g.a * 0.35;
      ctx.translate(g.x, GROUND_Y + g.y); ctx.scale(g.dir * SCALE, SCALE);
      drawCreature(ctx, this.kind, g.J, g.pose, t, this.ghostPal, { flat: true });
      ctx.restore();
    }
    ctx.save();
    ctx.translate(this.x, GROUND_Y + this.y);
    ctx.scale(this.dir * SCALE, SCALE);
    const flash = this.flashT > 0;
    let glow = null;
    if (this.state === 'attack' && this.move.glow) {
      const m = this.move, k = m.act ? clamp((this.moveT - m.act[0] + 0.08) / 0.1, 0, 1) * clamp((m.dur - this.moveT) / 0.15, 0, 1) : clamp(this.moveT / 0.2, 0, 1) * clamp((m.dur - this.moveT) / 0.2, 0, 1);
      glow = {};
      for (const ch of m.glow) glow[ch] = k * (m.heavy || m.cost ? 1.25 : 0.8);
    }
    drawCreature(ctx, this.kind, this.J, this.pose, t, shadow ? SHADOW : flash ? WHITE : d.pal, { flat: flash || shadow, glow });
    ctx.restore();
  }
}

// CPU opponent: produces the same input object a human would.
export class AI {
  constructor(level) {
    this.lv = LEVELS[level];
    this.timer = 0.4; this.mx = 0;
    this.out = { mx: 0, jump: false, attack: false, heavy: false, special: false, dash: false };
  }
  think(me, opp, G, dt) {
    const o = this.out, lv = this.lv, R = Math.random;
    o.jump = o.attack = o.heavy = o.special = o.dash = false;
    this.timer -= dt;
    if (this.timer > 0) { o.mx = this.mx; return o; }
    this.timer = lv.react * (0.7 + R() * 0.6);
    const d = Math.abs(opp.x - me.x), to = opp.x >= me.x ? 1 : -1;
    const proj = G.projThreat(me);
    if ((opp.threat(me) || proj) && R() < lv.block) {
      if (proj && R() < 0.3) o.jump = true;
      else { this.mx = -to; this.timer = 0.32; }
    } else if (me.state === 'attack') {
      if (R() < lv.combo) o.attack = true;
      this.timer = 0.09;
    } else if (me.state === 'jump') {
      if (d < 170 && R() < 0.6) o.attack = true;
    } else if (opp.state === 'down' || opp.state === 'getup' || opp.state === 'ko') {
      this.mx = d < 220 ? -to : 0;
    } else if (d > 430) {
      this.mx = to;
      if (me.canPay('special') && R() < lv.zone) o.special = true;
      else if (R() < 0.1) o.dash = true;
    } else if (d > 185) {
      this.mx = to;
      if (me.canPay('heavy') && R() < lv.heavy) o.heavy = true;
      else if (R() < 0.07) o.jump = true;
      else if (me.canPay('special') && R() < lv.zone * 0.5) o.special = true;
    } else {
      const r = R();
      this.mx = 0;
      if (r < lv.aggr) o.attack = true;
      else if (r < lv.aggr + 0.1 && me.canPay('heavy')) o.heavy = true;
      else if (r < lv.aggr + 0.24) { this.mx = -to; this.timer = 0.3; }
    }
    o.mx = this.mx;
    return o;
  }
}
