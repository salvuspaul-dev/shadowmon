// Procedural creature rig: poses, animation sampling, forward kinematics and drawing.
import { rad, lerp, ease } from './config.js';
import { plume, sprite } from './fx.js';

export const SCALE = 0.9;
const L = { thigh: 54, shin: 50, foot: 36, spine: 92, neck: 40, uArm: 50, lArm: 48 };
const TAIL_LEN = { infernix: [38, 36, 34, 30], aquarion: [42, 40, 38, 34] };
const RAD = {
  infernix: { torso: [29, 35], neck: [19, 16], ua: [16, 13], la: [13, 17], th: [27, 18], sh: [17, 11], ft: [12, 10], tail: [10, 9, 8, 6, 4] },
  aquarion: { torso: [33, 41], neck: [23, 18], ua: [18, 15], la: [15, 18], th: [30, 20], sh: [19, 12], ft: [13, 11], tail: [24, 20, 15, 10, 6] },
};

// Angles in degrees: 0 = forward, 90 = down, -90 = up, 180 = backward.
const BASE = { spine: -68, neck: -38, head: -6, aF: [58, -28], aB: [28, -55], lF: [48, 126, 56], lB: [116, 152, 74], tail: [200, 10] };
const P = o => ({ ...BASE, ...o });
const POSE = {
  idleA: P({}),
  idleB: P({ spine: -71, aF: [63, -22], aB: [33, -49], lF: [52, 129, 56], lB: [119, 155, 74], tail: [205, 12] }),
  w1: P({ spine: -66, lF: [28, 108, 38], lB: [132, 162, 96], aF: [70, -15], aB: [20, -60] }),
  w2: P({ spine: -69, lF: [68, 130, 60], lB: [78, 150, 62], aF: [55, -30], aB: [35, -50] }),
  w3: P({ spine: -66, lF: [126, 158, 92], lB: [30, 110, 40], aF: [40, -40], aB: [50, -35] }),
  w4: P({ spine: -69, lF: [82, 150, 62], lB: [66, 128, 58], aF: [55, -30], aB: [35, -50] }),
  jumpUp: P({ spine: -80, neck: -50, lF: [20, 120, 80], lB: [60, 150, 100], aF: [-30, -80], aB: [-60, -100], tail: [160, -6] }),
  jumpFall: P({ spine: -74, lF: [60, 100, 60], lB: [100, 130, 80], aF: [-80, -40], aB: [-110, -60], tail: [232, 10] }),
  jab0: P({ spine: -72, aF: [105, -50], aB: [20, -60] }),
  jab1: P({ spine: -54, neck: -28, head: 0, aF: [-6, -4], aB: [70, -60], lF: [40, 120, 50] }),
  cross0: P({ spine: -62, aF: [100, -30], aB: [110, -40] }),
  cross1: P({ spine: -47, neck: -22, head: 2, aB: [0, 2], aF: [118, -8], lF: [36, 118, 48], lB: [124, 158, 84] }),
  kick0: P({ spine: -86, lF: [8, 100, 40], aF: [70, 10], aB: [120, 80] }),
  kick1: P({ spine: -102, neck: -60, head: -12, lF: [-10, -8, -18], lB: [96, 102, 62], aF: [84, 34], aB: [142, 104], tail: [150, -8] }),
  slash0: P({ spine: -82, neck: -50, aF: [-112, -150], aB: [44, -30], lF: [40, 120, 50], tail: [170, -4] }),
  slash1: P({ spine: -40, neck: -16, head: 10, aF: [24, 18], aB: [150, 120], lF: [28, 114, 44], lB: [140, 166, 100], tail: [214, 14] }),
  slash2: P({ spine: -36, neck: -12, head: 12, aF: [82, 70], aB: [150, 130], lF: [30, 116, 46], lB: [138, 164, 98] }),
  cast0: P({ spine: -76, aF: [122, 62], aB: [126, 66], tail: [180, 0] }),
  cast1: P({ spine: -54, neck: -26, head: -2, aF: [-6, 0], aB: [4, 8], lF: [34, 118, 48], lB: [126, 160, 86], tail: [218, 14] }),
  airkick: P({ spine: -96, neck: -64, head: -10, lF: [22, 26, 12], lB: [92, 160, 110], aF: [-40, -90], aB: [160, 120], tail: [150, -8] }),
  dash: P({ spine: -34, neck: -10, head: 14, aF: [150, 130], aB: [160, 142], lF: [20, 110, 30], lB: [150, 170, 120], tail: [186, 3] }),
  block: P({ spine: -76, neck: -46, head: -14, aF: [-30, -96], aB: [-10, -102], lF: [55, 128, 56] }),
  hit: P({ spine: -102, neck: -84, head: -36, aF: [100, 60], aB: [130, 90], lF: [60, 120, 60], tail: [170, -8] }),
  knock: P({ spine: -150, neck: -160, head: -62, aF: [-120, -150], aB: [-140, -170], lF: [-20, 20, -10], lB: [10, 50, 20], tail: [150, -10] }),
  down: P({ spine: -178, neck: -176, head: -72, aF: [-160, -176], aB: [176, 182], lF: [-6, 12, -58], lB: [6, 26, -48], tail: [176, 2] }),
  getup: P({ spine: -122, neck: -84, head: -20, aF: [118, 150], aB: [130, 160], lF: [30, 130, 50], lB: [100, 160, 80] }),
  win: P({ spine: -86, neck: -72, head: -52, aF: [-60, -112], aB: [-122, -72], tail: [222, 14] }),
  win2: P({ spine: -88, neck: -76, head: -58, aF: [-66, -118], aB: [-128, -78], tail: [228, 16] }),
};
const A = (dur, loop, keys) => ({ dur, loop, keys: keys.map(([t, n]) => [t, POSE[n]]) });
export const ANIMS = {
  idle: A(1.6, true, [[0, 'idleA'], [0.8, 'idleB']]),
  walk: A(0.56, true, [[0, 'w1'], [0.14, 'w2'], [0.28, 'w3'], [0.42, 'w4']]),
  light1: A(0.3, false, [[0, 'idleA'], [0.06, 'jab0'], [0.11, 'jab1'], [0.19, 'jab1'], [0.3, 'idleA']]),
  light2: A(0.34, false, [[0, 'jab1'], [0.07, 'cross0'], [0.13, 'cross1'], [0.21, 'cross1'], [0.34, 'idleA']]),
  light3: A(0.52, false, [[0, 'idleA'], [0.1, 'kick0'], [0.18, 'kick1'], [0.3, 'kick1'], [0.52, 'idleA']]),
  heavy: A(0.74, false, [[0, 'idleA'], [0.2, 'slash0'], [0.28, 'slash1'], [0.44, 'slash2'], [0.74, 'idleA']]),
  special: A(0.62, false, [[0, 'idleA'], [0.2, 'cast0'], [0.28, 'cast1'], [0.44, 'cast1'], [0.62, 'idleA']]),
  air: A(0.6, false, [[0, 'jumpUp'], [0.08, 'airkick'], [0.6, 'airkick']]),
  dash: A(1, false, [[0, 'dash']]),
  block: A(1, false, [[0, 'block']]),
  hit: A(1, false, [[0, 'hit']]),
  knock: A(1, false, [[0, 'knock']]),
  down: A(1, false, [[0, 'down']]),
  getup: A(0.4, false, [[0, 'down'], [0.2, 'getup'], [0.4, 'idleA']]),
  win: A(1.4, true, [[0, 'win'], [0.7, 'win2']]),
};
export const JUMP = [POSE.jumpUp, POSE.jumpFall];

export function lerpPose(a, b, t) {
  const o = {};
  for (const k in a) {
    const x = a[k], y = b[k];
    o[k] = Array.isArray(x) ? x.map((v, i) => lerp(v, y[i], t)) : lerp(x, y, t);
  }
  return o;
}
export function sample(anim, t) {
  const ks = anim.keys, n = ks.length;
  if (n === 1) return ks[0][1];
  if (anim.loop) t = ((t % anim.dur) + anim.dur) % anim.dur;
  else if (t >= ks[n - 1][0]) return ks[n - 1][1];
  for (let i = 0; i < n; i++) {
    const t0 = ks[i][0], last = i === n - 1, t1 = last ? anim.dur : ks[i + 1][0];
    if (t >= t0 && t < t1) return lerpPose(ks[i][1], last ? ks[0][1] : ks[i + 1][1], ease((t - t0) / (t1 - t0)));
  }
  return ks[0][1];
}

const pt = (p, ang, len) => ({ x: p.x + Math.cos(rad(ang)) * len, y: p.y + Math.sin(rad(ang)) * len });

// Forward kinematics. Returns joints with the lowest body point resting on y = 0.
export function solve(pose, kind, t) {
  const hip = { x: 0, y: 0 };
  const chest = pt(hip, pose.spine, L.spine);
  const sh = pt(hip, pose.spine, L.spine - 12);
  const head = pt(chest, pose.neck, L.neck);
  const shF = { x: sh.x + 5, y: sh.y + 2 }, shB = { x: sh.x - 5, y: sh.y - 2 };
  const elF = pt(shF, pose.aF[0], L.uArm), haF = pt(elF, pose.aF[1], L.lArm);
  const elB = pt(shB, pose.aB[0], L.uArm), haB = pt(elB, pose.aB[1], L.lArm);
  const hF = { x: 8, y: 4 }, hB = { x: -8, y: 2 };
  const knF = pt(hF, pose.lF[0], L.thigh), anF = pt(knF, pose.lF[1], L.shin), toF = pt(anF, pose.lF[2], L.foot);
  const knB = pt(hB, pose.lB[0], L.thigh), anB = pt(knB, pose.lB[1], L.shin), toB = pt(anB, pose.lB[2], L.foot);
  const tail = [pt(hip, pose.spine + 180, 16)];
  let a = pose.tail[0];
  TAIL_LEN[kind].forEach((len, i) => {
    tail.push(pt(tail[i], a + Math.sin(t * 3.2 + i * 0.9) * (3 + i * 3), len));
    a += pose.tail[1];
  });
  const low = Math.max(toF.y + 9, toB.y + 9, anF.y + 11, anB.y + 11, knF.y + 17, knB.y + 17, hip.y + 30, chest.y + 34, head.y + 28, haF.y + 14, haB.y + 14);
  const J = { hip, chest, sh, head, shF, shB, elF, haF, elB, haB, hF, hB, knF, anF, toF, knB, anB, toB };
  for (const k in J) J[k].y -= low;
  for (const p of tail) p.y -= low;
  J.tail = tail;
  return J;
}

function limb(ctx, a, ra, b, rb) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.beginPath();
  ctx.arc(a.x, a.y, ra, ang + Math.PI / 2, ang - Math.PI / 2);
  ctx.arc(b.x, b.y, rb, ang - Math.PI / 2, ang + Math.PI / 2);
  ctx.closePath();
}
function fs(ctx, fill, line, lw = 2.5) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (line) { ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}
function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}
function claws(ctx, p, ang, n, len, col) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(ang);
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.rotate((i - (n - 1) / 2) * 0.42);
    ctx.beginPath(); ctx.moveTo(4, -5); ctx.lineTo(len, 0); ctx.lineTo(4, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
const angOf = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

export function headInfernix(ctx, t, c, flat) {
  // ears
  poly(ctx, [-18, -8, -40, -66, 0, -22]); fs(ctx, c.back, c.line);
  poly(ctx, [-6, -16, -16, -78, 14, -20]); fs(ctx, c.body, c.line);
  poly(ctx, [-4, -22, -12, -62, 8, -22]); fs(ctx, c.fur, null);
  // cheek fluff
  poly(ctx, [-6, -8, -44, -16, -28, -2, -52, 10, -28, 12, -42, 30, -14, 22, -4, 30, 2, 14]); fs(ctx, c.fur, c.line, 2);
  // skull and snout
  ctx.beginPath();
  ctx.moveTo(-22, 2);
  ctx.bezierCurveTo(-24, -18, -4, -27, 10, -22);
  ctx.lineTo(34, -8);
  ctx.quadraticCurveTo(49, -4, 46, 4);
  ctx.lineTo(30, 10);
  ctx.quadraticCurveTo(10, 20, -10, 16);
  ctx.quadraticCurveTo(-22, 12, -22, 2);
  ctx.closePath();
  fs(ctx, c.body, c.line);
  // muzzle underside
  poly(ctx, [45, 4, 30, 10, 6, 17, 10, 8, 30, 3]); fs(ctx, c.belly, null);
  poly(ctx, [26, 9, 30, 16, 33, 8]); fs(ctx, flat ? c.body : '#fff', null);
  if (!flat) {
    // forehead mark, brow, eye, nose
    poly(ctx, [-8, -22, 4, -30, 10, -21, 2, -17]); fs(ctx, c.mark, null);
    poly(ctx, [3, -12, 20, -12, 25, -6, 8, -4]); fs(ctx, c.eye, c.line, 1.5);
    ctx.fillStyle = c.line; ctx.fillRect(13, -11, 3, 6);
    ctx.strokeStyle = c.line; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(25, -11); ctx.stroke();
    poly(ctx, [42, -5, 48, -2, 43, 1]); fs(ctx, c.line, null);
    plume(ctx, 'fire', -2, -26, rad(-125), 44, 20, t, 5);
  }
}
export function headAquarion(ctx, t, c, flat) {
  // back fins
  poly(ctx, [-4, -18, -80, -56, -24, -4]); fs(ctx, c.fin, c.line);
  poly(ctx, [-10, -16, -62, -44, -24, -8]); fs(ctx, c.finL, null);
  poly(ctx, [-12, -6, -88, -14, -20, 10]); fs(ctx, c.back, c.line);
  poly(ctx, [-10, 8, -62, 26, -4, 17]); fs(ctx, c.fin, c.line);
  // snout crest
  poly(ctx, [26, -15, 36, -30, 42, -11]); fs(ctx, c.fin, c.line, 2);
  // skull and snout
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.bezierCurveTo(-24, -20, 0, -25, 16, -20);
  ctx.lineTo(52, -6);
  ctx.quadraticCurveTo(63, -2, 57, 4);
  ctx.lineTo(34, 9);
  ctx.quadraticCurveTo(8, 19, -10, 16);
  ctx.quadraticCurveTo(-22, 12, -22, 0);
  ctx.closePath();
  fs(ctx, c.body, c.line);
  poly(ctx, [56, 4, 34, 9, 4, 17, 8, 9, 36, 3]); fs(ctx, c.belly, null);
  poly(ctx, [48, 5, 45, 10, 42, 6, 39, 11, 36, 7, 33, 12, 30, 8]); fs(ctx, flat ? c.body : '#fff', null);
  if (!flat) {
    poly(ctx, [6, -12, 24, -11, 28, -5, 11, -4]); fs(ctx, c.eye, c.line, 1.5);
    ctx.fillStyle = c.line; ctx.fillRect(16, -10, 3, 6);
    ctx.strokeStyle = c.line; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(2, -17); ctx.lineTo(29, -10); ctx.stroke();
    ctx.strokeStyle = c.mark; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-14, -12); ctx.lineTo(0, -19); ctx.stroke();
  }
}

// Draws a creature in its local space (already translated to feet, scaled and flipped).
export function drawCreature(ctx, kind, J, pose, t, c, o = {}) {
  const fox = kind === 'infernix', R = RAD[kind], el = fox ? 'fire' : 'water', flat = !!o.flat;
  const g = o.glow || {};
  const T = J.tail;
  // tail
  if (fox) {
    for (let i = 0; i < 4; i++) { limb(ctx, T[i], R.tail[i], T[i + 1], R.tail[i + 1]); fs(ctx, c.body, c.line); }
    if (!flat) plume(ctx, 'fire', T[4].x, T[4].y, angOf(T[3], T[4]) - 0.5, 74, 36, t, 1);
  } else {
    ctx.save();
    ctx.translate(T[4].x, T[4].y);
    ctx.rotate(angOf(T[3], T[4]));
    poly(ctx, [-6, -8, 58, -50, 36, -4, 66, 36, -6, 10]); fs(ctx, c.fin, c.line);
    poly(ctx, [0, -5, 44, -36, 28, -3, 48, 24, 0, 6]); fs(ctx, c.finL, null);
    ctx.restore();
    for (let i = 0; i < 4; i++) { limb(ctx, T[i], R.tail[i], T[i + 1], R.tail[i + 1]); fs(ctx, c.body, c.line); }
  }
  // back arm and leg
  limb(ctx, J.shB, R.ua[0], J.elB, R.ua[1]); fs(ctx, c.back, c.line);
  limb(ctx, J.elB, R.la[0], J.haB, R.la[1]); fs(ctx, c.back, c.line);
  claws(ctx, J.haB, angOf(J.elB, J.haB), 3, 20, c.claw);
  limb(ctx, J.hB, R.th[0], J.knB, R.th[1]); fs(ctx, c.back, c.line);
  limb(ctx, J.knB, R.sh[0], J.anB, R.sh[1]); fs(ctx, c.back, c.line);
  limb(ctx, J.anB, R.ft[0], J.toB, R.ft[1]); fs(ctx, c.back, c.line);
  claws(ctx, J.toB, angOf(J.anB, J.toB), 3, 15, c.claw);
  // dorsal fin
  if (!fox) {
    const b0 = pt(J.hip, pose.spine, 30), b1 = pt(J.hip, pose.spine, 86), tip = pt(pt(J.hip, pose.spine, 44), pose.spine - 118, 66);
    poly(ctx, [b0.x, b0.y, tip.x, tip.y, b1.x, b1.y]); fs(ctx, c.fin, c.line);
  }
  // torso, belly, neck
  limb(ctx, J.hip, R.torso[0], J.chest, R.torso[1]); fs(ctx, c.body, c.line);
  const bA = pt(pt(J.hip, pose.spine, 6), pose.spine + 90, 9), bB = pt(pt(J.hip, pose.spine, L.spine - 16), pose.spine + 90, 10);
  limb(ctx, bA, R.torso[0] - 10, bB, R.torso[1] - 12); fs(ctx, c.belly, null);
  limb(ctx, J.chest, R.neck[0], J.head, R.neck[1]); fs(ctx, c.body, c.line);
  // front leg
  limb(ctx, J.hF, R.th[0], J.knF, R.th[1]); fs(ctx, c.body, c.line);
  limb(ctx, J.knF, R.sh[0], J.anF, R.sh[1]); fs(ctx, c.body, c.line);
  limb(ctx, J.anF, R.ft[0], J.toF, R.ft[1]); fs(ctx, c.body, c.line);
  claws(ctx, J.toF, angOf(J.anF, J.toF), 3, 16, c.claw);
  if (g.L && !flat) plume(ctx, el, J.toF.x, J.toF.y, angOf(J.toF, J.anF), 70 * g.L, 34 * g.L, t, 7);
  // chest fluff (fox) / gill marks (shark)
  if (fox) {
    const cp = pt(pt(J.hip, pose.spine, L.spine - 8), pose.spine + 90, 16);
    for (let i = -2; i <= 2; i++) {
      const a = pose.spine + 125 + i * 26, tip = pt(cp, a, 30 - Math.abs(i) * 3), l = pt(cp, a - 90, 10), r = pt(cp, a + 90, 10);
      poly(ctx, [l.x, l.y, tip.x, tip.y, r.x, r.y]); fs(ctx, c.fur, c.line, 2);
    }
    ctx.beginPath(); ctx.arc(cp.x, cp.y, 13, 0, 7); fs(ctx, c.fur, null);
  }
  // head
  ctx.save();
  ctx.translate(J.head.x, J.head.y);
  ctx.rotate(rad(pose.head));
  ctx.scale(1.3, 1.3);
  (fox ? headInfernix : headAquarion)(ctx, t, c, flat);
  ctx.restore();
  // front arm
  limb(ctx, J.shF, R.ua[0], J.elF, R.ua[1]); fs(ctx, c.body, c.line);
  if (!fox) {
    const fa = pt(J.elF, pose.aF[1] + 150, 34), fb = pt(J.elF, pose.aF[1], 26);
    poly(ctx, [J.elF.x, J.elF.y, fa.x, fa.y, fb.x, fb.y]); fs(ctx, c.fin, c.line, 2);
  }
  limb(ctx, J.elF, R.la[0], J.haF, R.la[1]); fs(ctx, fox ? c.back : c.body, c.line);
  claws(ctx, J.haF, angOf(J.elF, J.haF), 3, 22, c.claw);
  if (!flat) {
    if (g.F) plume(ctx, el, J.haF.x, J.haF.y, angOf(J.haF, J.elF) + 0.2, 80 * g.F, 38 * g.F, t, 3);
    if (g.B) plume(ctx, el, J.haB.x, J.haB.y, angOf(J.haB, J.elB) + 0.2, 70 * g.B, 34 * g.B, t, 4);
    const gl = Math.max(g.F || 0, g.B || 0);
    if (gl) {
      ctx.globalCompositeOperation = 'lighter';
      const hp = (g.F || 0) >= (g.B || 0) ? J.haF : J.haB, s = 60 * gl;
      ctx.drawImage(sprite(el), hp.x - s, hp.y - s, s * 2, s * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

export function flatPal(col) {
  return { body: col, back: col, belly: col, fur: col, furD: col, fin: col, finL: col, claw: col, eye: col, line: null, mark: col };
}
