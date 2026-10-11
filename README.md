# ShadowMon

A 1-v-1 monster fighting game for the browser. Infernix (fire) versus Aquarion (water) on a sunset temple bridge, best of three rounds against the CPU.

Everything on screen is drawn in code on a single canvas: the stage, both creatures, their animation and the effects. There are no image or audio files.

## Play

Open `dist/index.html` in a browser. It is one self-contained file and works offline.

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | A / D or arrow keys | stick left / right |
| Jump | W, up arrow or Space | stick up |
| Attack (3-hit combo) | J or Z | large button |
| Strike (costs energy) | K or X | crescent button |
| Blast (costs energy) | L or C | orb button |
| Dash | Shift or V | chevron button |
| Block | hold away from the opponent | hold the stick away |
| Pause | P or Esc | pause button under the timer |

On a phone held upright the game turns itself sideways, so it fills the screen even with rotation lock on.

Add `#demo` to the address to watch the CPU fight itself.

## Build

```
npm install
npm run build
```

`build.mjs` bundles `src/` with esbuild and inlines the script and the Teko font into `dist/index.html`.

## Layout

- `src/config.js` — tuning: characters, moves, damage, AI levels
- `src/rig.js` — creature skeleton, poses, animation and drawing
- `src/fighter.js` — fighter state machine, hit handling, CPU opponent
- `src/stage.js` — the painted parallax stage
- `src/fx.js` — particles, slashes, projectiles, screen shake
- `src/ui.js` — keyboard and touch input, sound, HUD, on-screen controls
- `src/main.js` — game loop, match flow, menus
- `tools/` — headless-browser scripts used to test the build (need Python Playwright)

## Credits

Teko typeface by Indian Type Foundry, SIL Open Font License.
