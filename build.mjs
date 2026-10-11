// Bundles src/ into one self-contained page.
//   dist/index.html    – full document, open it or host it anywhere
//   dist/fragment.html – same page without <html>/<head>/<body>, for hosts that add their own
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const out = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2019' });
const js = out.outputFiles[0].text;
const font = w => readFileSync(`node_modules/@fontsource/teko/files/teko-latin-${w}-normal.woff2`).toString('base64');
const css = `
@font-face{font-family:Teko;font-weight:500;font-display:block;src:url(data:font/woff2;base64,${font(500)}) format('woff2')}
@font-face{font-family:Teko;font-weight:700;font-display:block;src:url(data:font/woff2;base64,${font(700)}) format('woff2')}
/* One fixed look: a night-dark frame around a full-bleed fight screen. */
:root{--ink:#0b0810;--paper:#f4e9d8;--ember:#ff8a2a;--tide:#4fc3f7;color-scheme:dark}
html,body{height:100%}
body{margin:0;background:var(--ink);color:var(--paper);overflow:hidden;font-family:Teko,Impact,"Arial Narrow",sans-serif;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;overscroll-behavior:none}
#wrap{position:relative;height:100%;width:100%;overflow:hidden;touch-action:none}
#game{position:absolute;left:50%;top:50%;display:block;touch-action:none;outline:none;background:var(--ink)}
`;
const body = `<div id="wrap"><canvas id="game" aria-label="ShadowMon fighting game"></canvas></div>\n<script>${js.replace(/<\/script/g, '<\\/script')}</script>`;
const head = `<title>ShadowMon</title>\n<style>${css}</style>`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/fragment.html', `${head}\n${body}\n`);
writeFileSync('dist/index.html', `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`);
console.log('built', (js.length / 1024).toFixed(1) + ' KB js');
