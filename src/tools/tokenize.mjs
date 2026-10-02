// One-time refactor kept for the record: move every colour literal in src/styles/site.css into tokens.css
// (same values; call sites become var()). Run from the project root: node src/tools/tokenize.mjs
import fs from 'node:fs';
const P = 'src/styles/';
const MAP = [
  ['#ffffff', '--white'], ['#fff', '--white'], ['#000', '--black'], ['#050b1c', '--ink-0'],
  ['#dff3ff', '--ice'], ['#c8e8ff', '--ice-2'],
  ['rgba(255, 255, 255, 0.06)', '--wash-06'], ['rgba(255, 255, 255, 0.07)', '--wash-07'], ['rgba(255, 255, 255, 0.08)', '--wash-08'],
  ['rgba(255, 255, 255, 0.1)', '--wash-10'], ['rgba(255, 255, 255, 0.12)', '--wash-12'], ['rgba(255, 255, 255, 0.14)', '--wash-14'],
  ['rgba(255, 255, 255, 0.18)', '--wash-18'], ['rgba(255, 255, 255, 0.3)', '--wash-30'], ['rgba(255, 255, 255, 0.35)', '--wash-35'],
  ['rgba(255, 255, 255, 0.6)', '--wash-60'], ['rgba(255, 255, 255, 0.85)', '--wash-85'], ['rgba(255, 255, 255, 0.9)', '--wash-90'],
  ['rgba(12, 143, 216, 0.35)', '--glow-azure'], ['rgba(12, 143, 216, 0.55)', '--glow-azure-strong'], ['rgba(41, 201, 224, 0.45)', '--glow-cyan'],
  ['rgba(3, 8, 22, 0.55)', '--scrim'], ['rgba(2, 6, 20, 0.25)', '--shadow-tile'],
];
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let css = fs.readFileSync(P + 'site.css', 'utf8');
const parts = css.split(/(\/\*[\s\S]*?\*\/)/);   // odd indexes are comments: left alone
let n = 0;
for (let i = 0; i < parts.length; i += 2) {
  for (const [lit, tok] of MAP) {
    const re = new RegExp(escRe(lit) + (lit.startsWith('#') ? '(?![0-9a-fA-F])' : ''), 'g');
    parts[i] = parts[i].replace(re, () => { n++; return 'var(' + tok + ')'; });
  }
}
css = parts.join('');
fs.writeFileSync(P + 'site.css', css);
let tok = fs.readFileSync(P + 'tokens.css', 'utf8');
const seen = new Map();
for (const [l, t] of MAP) if (t !== '--ink-0' && !seen.has(t)) seen.set(t, l === '#fff' ? '#ffffff' : l);
const block = '\n  /* neutrals and washes used by site.css (white at fixed alphas, glows, scrim) */\n'
  + [...seen].map(([t, l]) => '  ' + t + ': ' + l + ';').join('\n') + '\n';
if (!tok.includes('--wash-06')) tok = tok.replace('\n  /* motion */', block + '\n  /* motion */');
fs.writeFileSync(P + 'tokens.css', tok);
const left = css.replace(/\/\*[\s\S]*?\*\//g, ' ').match(/#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/g) || [];
console.log('replaced', n, '· literals left in site.css', left.length, left.join(' '));
