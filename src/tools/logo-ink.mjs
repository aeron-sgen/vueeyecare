// Measures the INKED box of every logo shipped in the home logo grids, so the grids can crop each file's own
// padding and show every brand at the same visual weight (the source files share one 1.21:1 canvas, but the mark
// inside ranges from a thin wordmark to a full-bleed badge).
// usage: node src/tools/logo-ink.mjs <cdp.mjs> <baseUrl serving dist/>     (run after a build; then build again)
// Writes audit/logo-ink.json: { "<file name>": { w, h, x, y, iw, ih } } — natural size and ink box in pixels.
// Background = the colour of the four corners (several files carry a faint off-white canvas, not transparency).
// Ink on an opaque canvas = RGB differs from the corner colour by more than 96 (sum of channel deltas).
// Ink on a transparent canvas = visible contrast against white: alpha/255 x (765 - R - G - B) > 96. Several files
// carry a faint panel of light pixels at alpha ~16-40 that must not count as ink.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [, , cdpPath, base] = process.argv;
if (!cdpPath || !base) { console.error('usage: node src/tools/logo-ink.mjs <cdp.mjs> <baseUrl>'); process.exit(1); }
const { launch, newPage } = await import(pathToFileURL(cdpPath).href);
const b = await launch(9441); const p = await newPage(b.port);
await p.viewport(1440);
await p.goto(base.replace(/\/$/, '') + '/', { idle: 600 });
const out = await p.eval(`(async () => {
  const srcs = [...new Set([...document.querySelectorAll('.logo-grid img')].map((i) => i.getAttribute('src')))];
  const res = {};
  for (const src of srcs) {
    const im = new Image(); im.src = src; await im.decode();
    const w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, w, h).data;
    const px = (x, y) => { const k = (y * w + x) * 4; return [d[k], d[k + 1], d[k + 2], d[k + 3]]; };
    const corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
    const opaqueBg = corners.every((c) => c[3] > 200);
    const bg = [0, 1, 2].map((i) => Math.round(corners.reduce((a, c) => a + c[i], 0) / 4));
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      if (opaqueBg ? (Math.abs(d[k] - bg[0]) + Math.abs(d[k + 1] - bg[1]) + Math.abs(d[k + 2] - bg[2]) > 96) : (d[k + 3] * (765 - d[k] - d[k + 1] - d[k + 2]) / 255 > 96)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    // margin: anti-aliased glyph edges fall under the threshold, so the box grows 3% (min 4px) a side, within the canvas
    const m = Math.max(4, Math.round(0.03 * Math.max(x1 - x0, y1 - y0)));
    if (x1 >= 0) { x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m); }
    res[src.split('/').pop()] = x1 < 0 ? { w, h, x: 0, y: 0, iw: w, ih: h, empty: true } : { w, h, x: x0, y: y0, iw: x1 - x0 + 1, ih: y1 - y0 + 1 };
  }
  return res;
})()`);
p.close(); b.close();
fs.writeFileSync(path.join(ROOT, 'audit/logo-ink.json'), JSON.stringify({ generated: new Date().toISOString(), rule: 'opaque canvas: RGB delta > 96 from the corner colour; transparent canvas: alpha/255 x (765 - R - G - B) > 96', logos: out }, null, 1));
const n = Object.keys(out).length, empty = Object.values(out).filter((v) => v.empty).length;
console.log('logo-ink:', n, 'logos measured,', empty, 'with no ink found (shown uncropped)');
process.exit(0);
