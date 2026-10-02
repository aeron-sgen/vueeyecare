// Generated imagery for design C eyewear pages (Higgsfield API, Soul standard), copied from ../vue-eyecare and the Briargrove
// generator. usage: HF_KEY=<id:secret> node src/tools/generate-art.mjs <cdp.mjs> [--group shared|a|b] [slot ...]
//
// Policy: replaces the source's generic STOCK photos only, plus decorative art. Lifestyle photographs of people in
// everyday settings, product still lifes and abstract light. Never a clinic room, exam, procedure, treatment result,
// medical staff or anyone in a white coat or scrubs; clinical stock shots become close equipment macros with NO
// people, so no generated person can pass for Dr. Dinh, the staff, patients or the office. Dr. Dinh's real photo,
// the logo and every brand / insurance logo are kept. No text, lettering or logos in any image.
//
// Writes assets/generated/<slot>.jpg (JPEG q0.86, resized in headless Chrome's canvas) and records every prompt in
// audit/generated-art.json. Existing slots are skipped unless named. Shared slots are generated here (design A)
// and copied into ../vue-eyecare-b with their records.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'assets/generated');
const RECORD = path.join(ROOT, 'audit/generated-art.json');
const API = 'https://api.higgsfield.ai';
const MODEL = 'higgsfield-ai/soul/standard';
const POLICY = 'replaces generic stock photos only; lifestyle photographs of people in everyday settings, product still lifes, abstract light; never a clinic room, exam, procedure, result, medical staff, white coat or scrubs; clinical subjects become equipment macros with no people; no text or logos';
const NOTEXT = 'no text, no lettering, no words, no logos, no watermark, no border, full-bleed photograph filling the whole frame';
// Phrased POSITIVELY on purpose. QA 2026-10-01: naming what to avoid makes Soul draw it ("never a white coat" put a
// doctor with a stethoscope into a schoolboy photo; a clothing list put clothing racks in a bathroom), and colour
// cues for clothing produced matching scrubs-like outfits. The no-clinician policy is enforced by visual QA instead.
const PHOTO = 'candid editorial lifestyle photograph of one single natural everyday scene, the whole head in frame, soft natural daylight, an ordinary bright home or outdoor setting, a cool airy palette with touches of blue and warm gold in the surroundings, casual everyday clothing, shallow depth of field, the person centred with space around the head, natural relaxed expression, ' + NOTEXT;
const STILL = 'minimal editorial product still-life photograph, soft natural daylight, clean pale surfaces, colour accents of navy, azure and warm gold, crisp focus on the subject, no people, no hands unless stated, ' + NOTEXT;

// [group, prompt, aspect [w,h], style]
export const SLOTS = {
  // ── eyewear pages (operator, 2026-10-02: "use higgsfield api … to further enhance it"): sections with no photo
  //    of their own. Objects and generic lifestyle scenes only; no clinician, clinic, procedure or result.
  'g-cl-cases': ['shared', 'three open contact lens cases in white, navy and azure arranged neatly on a pale linen surface beside a small bottle of lens solution', [4, 3], STILL],
  'g-cl-drops': ['shared', 'real photograph of a white plastic bottle of lubricating eye drops and an open white contact lens case lying on a light wooden bathroom counter, soft morning window light, realistic everyday scene', [4, 3], 'natural realistic photograph, shallow depth of field, ' + NOTEXT],
  'g-cl-toric': ['shared', 'close-up real photograph of an index finger holding up one thin transparent soft contact lens, the lens is a thin clear flexible bowl shape the size of a fingertip, soft daylight by a window, blurred home background', [4, 3], 'natural realistic macro photograph, shallow depth of field, ' + NOTEXT],
  'g-cl-rigid': ['shared', 'close-up real photograph of a fingertip holding one small clear rigid gas permeable contact lens, a tiny transparent hard lens much smaller than the fingertip, soft daylight, blurred home background', [4, 3], 'natural realistic macro photograph, shallow depth of field, ' + NOTEXT],
  'g-cl-reader': ['shared', 'a woman in her fifties with short silver hair reading a book on a sofa in a bright living room, relaxed smile', [4, 3], PHOTO],
  'g-cl-consult': ['shared', 'a young man in a grey knit sweater at home smiling and holding a small contact lens case in his hand', [4, 3], PHOTO],
  'g-cl-mirror': ['shared', 'a young woman with curly hair at a bright bathroom mirror in her home, smiling, holding a contact lens case', [4, 3], PHOTO],
};

const args = process.argv.slice(2);
const cdpPath = args.shift();
const gi = args.indexOf('--group'); const GROUP = gi >= 0 ? args.splice(gi, 2)[1] : null;
const only = args;
const KEY = process.env.HF_KEY;
if (!cdpPath || !KEY) { console.error('usage: HF_KEY=<id:secret> node src/tools/generate-art.mjs <cdp.mjs> [--group shared|a|b] [slot ...]'); process.exit(1); }
const AUTH = { Authorization: 'Key ' + KEY, 'Content-Type': 'application/json' };
const { launch, newPage } = await import(pathToFileURL(path.resolve(cdpPath)).href);
fs.mkdirSync(OUT, { recursive: true });
const record = fs.existsSync(RECORD) ? JSON.parse(fs.readFileSync(RECORD, 'utf8')) : { images: {} };
Object.assign(record, { policy: POLICY, model: MODEL });
const todo = Object.keys(SLOTS).filter((k) => (only.length ? only.includes(k) : !fs.existsSync(path.join(OUT, k + '.jpg'))) && (!GROUP || SLOTS[k][0] === GROUP));
console.log('to generate', todo.length, todo.join(' '));

// submit + poll, several requests in flight at once (the API queues them)
async function generate(slot) {
  const [, subject, [aw, ah], style] = SLOTS[slot];
  const prompt = subject + ', ' + style;
  const aspect = aw + ':' + ah;
  // The LIVE API accepts resolution '720p' | '1080p' and aspect 9:16, 16:9, 4:3, 3:4, 1:1, 2:3, 3:2 only (422 otherwise,
  // verified 2026-10-01; docs/openapi.json says 2K/4K and 21:9, which the live endpoint rejects). A 21:9 banner is
  // requested at 16:9 and centre-cropped below.
  const res = await fetch(API + '/' + MODEL, { method: 'POST', headers: AUTH, body: JSON.stringify({ prompt, aspect_ratio: aspect === '21:9' ? '16:9' : aspect, resolution: '1080p', num_images: 1 }) });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
  let j = await res.json();
  const t0 = Date.now();
  while (!['completed', 'failed', 'nsfw', 'canceled'].includes(j.status) && Date.now() - t0 < 400000) {
    await new Promise((r) => setTimeout(r, 4000));
    const s = await fetch(j.status_url || API + '/requests/' + j.request_id + '/status', { headers: AUTH });
    if (s.ok) j = await s.json();
  }
  if (j.status !== 'completed') throw new Error('status ' + j.status);
  const url = j.images && j.images[0] && j.images[0].url;
  if (!url) throw new Error('no image in response');
  const raw = path.join(OUT, slot + '.raw');
  fs.writeFileSync(raw, Buffer.from(await (await fetch(url)).arrayBuffer()));
  return { raw, prompt, aspect, aw, ah, request_id: j.request_id };
}

// resize/crop to the slot's aspect in headless Chrome (served over loopback: canvas refuses file:// images)
const mime = (buf) => buf[0] === 0x89 && buf[1] === 0x50 ? 'image/png' : buf[0] === 0xff && buf[1] === 0xd8 ? 'image/jpeg' : buf.toString('latin1', 8, 12) === 'WEBP' ? 'image/webp' : 'application/octet-stream';
let serving = null;
const srv = http.createServer((q, r) => {
  if (!serving || !q.url.startsWith('/img')) { r.writeHead(200, { 'content-type': 'text/html' }); return r.end('<!doctype html><title>resize</title>'); }
  const buf = fs.readFileSync(serving); r.writeHead(200, { 'content-type': mime(buf) }); r.end(buf);
});
await new Promise((r) => srv.listen(8768, '127.0.0.1', r));
const b = await launch(9343); const p = await newPage(b.port);
await p.goto('http://127.0.0.1:8768/');

const POOL = 4; let next = 0; const fails = [];
const results = [];
await Promise.all(Array.from({ length: POOL }, async () => {
  while (next < todo.length) {
    const slot = todo[next++];
    try { results.push([slot, await generate(slot)]); console.log('generated', slot); }
    catch (e) { fails.push(slot); console.error(slot, 'FAILED', e.message); }
  }
}));
for (const [slot, g] of results) {
  serving = g.raw;
  const maxW = g.aw / g.ah >= 1.7 ? 2400 : 1800;
  // studio portraits on a flat colour ground: the flat edge IS the backdrop, never trim it
  const noTrim = SLOTS[slot][0] === 'b';
  const out = await p.eval(`(async () => {
    const bm = await createImageBitmap(await (await fetch('/img?' + Date.now())).blob());
    const W = bm.width, H = bm.height, AR = ${g.aw} / ${g.ah};
    const s = document.createElement('canvas'); s.width = W; s.height = H;
    const sx = s.getContext('2d', { willReadFrequently: true }); sx.drawImage(bm, 0, 0);
    const px = sx.getImageData(0, 0, W, H).data;
    const at = (x, y) => { const i = (y * W + x) * 4; return [px[i], px[i + 1], px[i + 2]]; };
    const same = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= 30;
    const flatCol = (x, ref) => { for (let y = 0; y < H; y += 3) if (!same(at(x, y), ref)) return false; return true; };
    const flatRow = (y, ref) => { for (let x = 0; x < W; x += 3) if (!same(at(x, y), ref)) return false; return true; };
    let l = 0, r = W - 1, t = 0, bo = H - 1;
    if (!${noTrim}) {
      const rl = at(1, H >> 1), rr = at(W - 2, H >> 1), rt = at(W >> 1, 1), rb = at(W >> 1, H - 2);
      while (l < W * 0.45 && flatCol(l, rl)) l++;
      while (r > W * 0.55 && flatCol(r, rr)) r--;
      while (t < H * 0.45 && flatRow(t, rt)) t++;
      while (bo > H * 0.55 && flatRow(bo, rb)) bo--;
    }
    // A real matte is even on opposite sides (Soul pillarboxes or letterboxes symmetrically). A one-sided flat run is
    // the photo's own background (sky, wall), so only the depth both sides share is trimmed (Briargrove rule).
    const lr = Math.min(l, W - 1 - r), tb = Math.min(t, H - 1 - bo);
    const trims = [tb > H * 0.01 ? tb : 0, lr > W * 0.01 ? lr : 0];
    let cx = trims[1] ? trims[1] + 4 : 0, cy = trims[0] ? trims[0] + 4 : 0, cw = W - 2 * cx, ch = H - 2 * cy;
    if (cw / ch > AR) { const nw = Math.round(ch * AR); cx += Math.round((cw - nw) / 2); cw = nw; } else { const nh = Math.round(cw / AR); cy += Math.round((ch - nh) / 2); ch = nh; }
    // a photo framed small inside a big matte is too low-resolution to use: report it for regeneration
    if (cw < (AR >= 1.7 ? 1400 : 1000)) return { reject: true, trims, cw };
    const w = Math.min(${maxW}, cw), h = Math.round(w / AR);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(bm, cx, cy, cw, ch, 0, 0, w, h);
    return { w, h, rawW: W, rawH: H, trims, data: c.toDataURL('image/jpeg', 0.86).split(',')[1] };
  })()`);
  if (out.reject) { fs.unlinkSync(g.raw); fails.push(slot); console.error(slot, 'REJECTED: only', out.cw + 'px wide inside a matte (t/b, l/r ' + out.trims.join('/') + '); run again to regenerate'); continue; }
  fs.writeFileSync(path.join(OUT, slot + '.jpg'), Buffer.from(out.data, 'base64'));
  fs.unlinkSync(g.raw);
  record.images[slot] = { file: 'assets/generated/' + slot + '.jpg', group: SLOTS[slot][0], prompt: g.prompt, model: MODEL, aspect: g.aspect, request_id: g.request_id, width: out.w, height: out.h, generated: new Date().toISOString() };
  fs.writeFileSync(RECORD, JSON.stringify(record, null, 1));
  console.log(slot, out.rawW + 'x' + out.rawH, '->', out.w + 'x' + out.h);
}
p.close(); b.close(); srv.close();
console.log('done', results.length, 'failed', fails.length, fails.join(' '));
process.exit(0);
