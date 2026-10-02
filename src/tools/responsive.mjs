// Responsive WebP variants for every shipped photo and the logo, encoded with headless Chrome's canvas
// encoder (no image library dependency, same approach as optimize.mjs).
// usage: node src/tools/responsive.mjs <cdp.mjs>      (run after a build: it reads dist/assets/img)
//
// Writes assets/responsive/<name>-<width>.webp and assets/responsive/manifest.json:
//   { "/assets/img/<name>": { "w": 1280, "h": 853, "variants": [[480, "/assets/r/<name>-480.webp"], ...] } }
// build.mjs copies assets/responsive/ to dist/assets/r/ and wraps each listed <img> in a <picture>
// whose WebP <source> carries the srcset; the original file stays as the <img> fallback.
// Existing variants are reused (delete assets/responsive/ to re-encode everything).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'assets/responsive');
const WIDTHS = [320, 480, 640, 960, 1280, 1600];
const Q_PHOTO = 0.78, Q_PNG = 0.9;
if (!process.argv[2]) { console.error('usage: node src/tools/responsive.mjs <path-to-cdp.mjs>'); process.exit(1); }
const { launch, newPage } = await import(pathToFileURL(path.resolve(process.argv[2])).href);

const sources = [
  ...fs.readdirSync(path.join(ROOT, 'dist/assets/img')).filter((f) => /\.(jpe?g|png)$/i.test(f)).map((f) => ['/assets/img/' + f, 'dist/assets/img/' + f]),
];   // the Briargrove logo is a 199px JPEG: there is nothing smaller to make
fs.mkdirSync(OUT, { recursive: true });
// canvas refuses to export images loaded from file:// (tainted), so serve the project over loopback
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200); fs.createReadStream(f).pipe(r);
});
await new Promise((r) => srv.listen(8766, '127.0.0.1', r));
const b = await launch(9343); const p = await newPage(b.port);
await p.goto('http://127.0.0.1:8766/src/tools/responsive.mjs');

const manifest = {};
let made = 0, reused = 0, skipped = 0, before = 0, after = 0;
for (const [pub, rel] of sources) {
  const file = path.join(ROOT, rel);
  const stem = path.basename(rel).replace(/\.\w+$/, '');
  const png = /\.png$/i.test(rel);
  const dim = await p.eval(`new Promise((res) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res([0, 0]); i.src = '/${rel}'; })`);
  if (!dim[0]) { skipped++; continue; }
  const [W, H] = dim;
  const widths = [...new Set([...WIDTHS.filter((w) => w < W), Math.min(W, 1600)])];
  const variants = [];
  for (const w of widths) {
    const name = stem + '-' + w + '.webp';
    const out = path.join(OUT, name);
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(file).mtimeMs) { reused++; }
    else {
      const url = await p.eval(`new Promise((res) => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = ${w}; c.height = Math.round(${H} * ${w} / ${W}); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL('image/webp', ${png ? Q_PNG : Q_PHOTO})); }; i.src = '/${rel}'; })`);
      if (!url.startsWith('data:image/webp')) throw new Error('WebP encoding unavailable in this Chrome');
      fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); made++;
    }
    variants.push([w, '/assets/r/' + name]);
  }
  // skip an image only when its single variant is no smaller than the original (tiny logos): with
  // several widths the smaller ones are the real saving even if the full-size WebP is a few % larger
  const top = fs.statSync(path.join(OUT, stem + '-' + widths[widths.length - 1] + '.webp')).size;
  const orig = fs.statSync(file).size;
  if (widths.length === 1 && top >= orig) { skipped++; continue; }
  before += orig; after += top;
  manifest[pub] = { w: W, h: H, variants };
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(JSON.stringify({ images: Object.keys(manifest).length, skipped, encoded: made, reused, fullSizeKB: { original: Math.round(before / 1024), webp: Math.round(after / 1024) } }));
p.close(); b.close(); srv.close(); process.exit(0);
