// Shared constants, tuning tables and small helpers.
export const VIEW_H = 720;
export const MIN_W = 960;
export const MAX_W = 1680;
export const WORLD_W = 2200;
export const GROUND_Y = 545;
export const GRAVITY = 2700;
export const ROUND_TIME = 99;
export const WINS_NEEDED = 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rad = d => (d * Math.PI) / 180;
export const ease = t => t * t * (3 - 2 * t);
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FONT = (size, weight = 700) => `${weight} ${size}px Teko, Impact, "Arial Narrow", sans-serif`;

export const CHARS = {
  infernix: {
    name: 'INFERNIX', element: 'fire', blurb: 'FAST  ·  HITS HARD',
    hp: 1000, speed: 345, jump: 1010, power: 1.12, reach: 1,
    color: '#ff8a2a', color2: '#ffd166',
    pal: {
      body: '#9a2c1c', back: '#561510', belly: '#f6e2bd', fur: '#f8ecd2', furD: '#d8bd92',
      fin: '#ff8a2a', finL: '#ffd166', claw: '#2a0c0a', eye: '#ffe44d', line: '#2b0907', mark: '#ff7a1f',
    },
  },
  aquarion: {
    name: 'AQUARION', element: 'water', blurb: 'TOUGH  ·  LONG REACH',
    hp: 1150, speed: 305, jump: 970, power: 1.0, reach: 1.14,
    color: '#4fc3f7', color2: '#c9f4ff',
    pal: {
      body: '#1d3777', back: '#0f1c44', belly: '#93dff8', fur: '#bfeeff', furD: '#6fc3ea',
      fin: '#3d94e6', finL: '#8ae6ff', claw: '#0a1230', eye: '#ffe44d', line: '#071027', mark: '#58c8ff',
    },
  },
};

// box = [x0, x1, y0, y1] relative to feet, facing forward (pixels on screen).
export const MOVES = {
  light1: { anim: 'light1', dur: 0.3, act: [0.09, 0.17], dmg: 42, box: [10, 150, -205, -120], kb: 150, stun: 0.3, next: 'light2', cancel: 0.17, step: 150, glow: 'F' },
  light2: { anim: 'light2', dur: 0.34, act: [0.1, 0.19], dmg: 52, box: [10, 160, -205, -115], kb: 170, stun: 0.32, next: 'light3', cancel: 0.2, step: 170, glow: 'B' },
  light3: { anim: 'light3', dur: 0.52, act: [0.15, 0.27], dmg: 84, box: [10, 185, -200, -90], kb: 520, stun: 0.4, launch: 560, step: 150, glow: 'L', heavy: true },
  heavy: { anim: 'heavy', dur: 0.74, act: [0.24, 0.4], dmg: 150, box: [0, 215, -250, -40], kb: 640, stun: 0.5, launch: 700, cost: 35, lunge: [0.14, 0.36, 760], glow: 'F', heavy: true, slash: true },
  special: { anim: 'special', dur: 0.62, cost: 20, fire: 0.27, glow: 'FB' },
  air: { anim: 'air', dur: 0.6, act: [0.08, 0.45], dmg: 70, box: [0, 150, -150, 20], kb: 300, stun: 0.34, glow: 'L' },
};
export const PROJ = { speed: 780, dmg: 95, kb: 300, stun: 0.36, life: 1.7 };
export const DASH = { dur: 0.26, speed: 980, cd: 0.75, inv: [0.02, 0.2] };

export const LEVELS = {
  easy: { react: 0.42, block: 0.15, aggr: 0.4, combo: 0.35, zone: 0.12, heavy: 0.1 },
  normal: { react: 0.26, block: 0.45, aggr: 0.6, combo: 0.65, zone: 0.25, heavy: 0.2 },
  hard: { react: 0.14, block: 0.75, aggr: 0.75, combo: 0.9, zone: 0.35, heavy: 0.3 },
};
