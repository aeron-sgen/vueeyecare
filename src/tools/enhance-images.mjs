// Enhance (upscale) the source's own stock photos that display soft, with Higgsfield's marketing-studio/image editor.
// The editor re-renders the photo, so every result is fidelity-checked against the original before it is used:
// the result is scaled back down to the original's size in headless Chrome and compared pixel by pixel; a result
// whose mean difference or aspect drifts past the limits is rejected and the original stays. Never applied to the
// doctor's photo, brand logos, or photos that may show the practice's own premises/equipment.
//
// usage: node src/tools/enhance-images.mjs <cdp.mjs> <keyFile> <name> [<name> ...]
//   <name> = a file name in dist/assets/img (e.g. 6f361b99-family-sitting-on-beige-couch.jpg-w_1200.webp)
//   <keyFile> holds "KEY_ID:KEY_SECRET" and lives outside the project (never commit it).
// Writes assets/enhanced/<name> (WebP) and audit/upscaled.json { images: { <name>: { file, from, to, ... } } };
// build.mjs swaps the enhanced copy in under the same URL (layout keeps the source width).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [, , cdpPath, keyFile, ...names] = process.argv;
if (!cdpPath || !keyFile || !names.length) { console.error('usage: node src/tools/enhance-images.mjs <cdp.mjs> <keyFile> <name> [...]'); process.exit(1); }
const { launch, newPage } = await import(pathToFileURL(cdpPath).href);
const KEY = fs.readFileSync(keyFile, 'utf8').trim();
const API = 'https://api.higgsfield.ai';
const MODEL = 'marketing-studio/image';
const AUTH = { Authorization: 'Key ' + KEY, 'Content-Type': 'application/json' };
const PROMPT = 'Upscale this exact photograph to high resolution. Keep everything identical: the same people, faces, expressions, hair, clothing, poses, objects, background, framing, colours and lighting. Do not add, remove or change anything. Only increase sharpness and fine detail, like a high-quality camera original.';
const MAX_W = 2400;            // shipped width cap
const MAX_MEAN_DIFF = 14;      // mean per-channel difference (0-255) after scaling back to the original size
const MAX_ASPECT_DRIFT = 0.03; // relative aspect-ratio change allowed (the result is centre-cropped back to the source shape)
const OUT = path.join(ROOT, 'assets/enhanced');
fs.mkdirSync(OUT, { recursive: true });
const RECORD = path.join(ROOT, 'audit/upscaled.json');
const record = fs.existsSync(RECORD) ? JSON.parse(fs.readFileSync(RECORD, 'utf8')) : { note: '', images: {} };
record.note = 'Source stock photos upscaled with Higgsfield ' + MODEL + ' (operator, 2026-10-02: "use this key to enhance any images needed"). Each passed a fidelity check against the original (scaled back to the original size: mean difference <= ' + MAX_MEAN_DIFF + ', aspect drift <= ' + MAX_ASPECT_DRIFT + '). Rejected results are listed under rejected.';
record.rejected = record.rejected || {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function upload(file) {
  const r = await fetch(API + '/files/generate-upload-url', { method: 'POST', headers: AUTH, body: JSON.stringify({ content_type: 'image/webp' }) });
  if (!r.ok) throw new Error('upload-url HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const u = await r.json();
  const put = await fetch(u.upload_url, { method: 'PUT', headers: u.upload_headers || { 'Content-Type': 'image/webp' }, body: fs.readFileSync(file) });
  if (!put.ok) throw new Error('upload PUT HTTP ' + put.status);
  return u.public_url;
}
// the editor only outputs these frames ("auto" re-composed a 2.36:1 photo into a square scene), so each photo is sent
// with the closest one and skipped when none is within 3% of its own shape
const ASPECTS = [['21:9', 21 / 9], ['16:9', 16 / 9], ['3:2', 1.5], ['4:3', 4 / 3], ['1:1', 1], ['3:4', 0.75], ['2:3', 2 / 3], ['9:16', 9 / 16]];
const nearestAspect = (w, h) => ASPECTS.map(([k, v]) => [k, v, Math.abs(v / (w / h) - 1)]).sort((a, b) => a[2] - b[2])[0];
async function enhance(url, aspect) {
  const r = await fetch(API + '/' + MODEL, { method: 'POST', headers: AUTH, body: JSON.stringify({ prompt: PROMPT, image_urls: [url], resolution: '4k', aspect_ratio: aspect }) });
  if (!r.ok) throw new Error('submit HTTP ' + r.status + ' ' + (await r.text()).slice(0, 300));
  let j = await r.json(); const t0 = Date.now();
  while (!['completed', 'failed', 'nsfw', 'canceled'].includes(j.status) && Date.now() - t0 < 600000) {
    await sleep(4000);
    const s = await fetch(j.status_url || API + '/requests/' + j.request_id + '/status', { headers: AUTH });
    j = { ...j, ...(await s.json()) };
  }
  if (j.status !== 'completed') throw new Error('status ' + j.status);
  const out = (j.images && j.images[0] && j.images[0].url) || (j.outputs && j.outputs[0] && j.outputs[0].url);
  if (!out) throw new Error('no image in response: ' + JSON.stringify(j).slice(0, 300));
  return { url: out, request_id: j.request_id, buf: Buffer.from(await (await fetch(out)).arrayBuffer()) };
}

// canvas work over loopback (canvas refuses file:// images)
const blobs = new Map();
const srv = http.createServer((q, s) => { const b = blobs.get(q.url); if (!b) { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('<!doctype html><title>x</title>'); } s.writeHead(200, { 'content-type': 'application/octet-stream' }); s.end(b); }).listen(8817);
const br = await launch(9851); const pg = await newPage(br.port);
await pg.goto('http://127.0.0.1:8817/', { idle: 100 });
const compareAndEncode = (origKey, newKey, maxW) => pg.eval(`(async () => {
  const load = async (u) => { const b = await (await fetch(u)).blob(); return await createImageBitmap(b); };
  const o = await load('${origKey}'), n0 = await load('${newKey}');
  const ta = o.width / o.height; let cw = n0.width, ch = n0.height; if (cw / ch > ta) cw = Math.round(ch * ta); else ch = Math.round(cw / ta);
  const cc = new OffscreenCanvas(cw, ch); cc.getContext('2d').drawImage(n0, (n0.width - cw) / 2, (n0.height - ch) / 2, cw, ch, 0, 0, cw, ch); const n = cc.transferToImageBitmap();
  const c = document.createElement('canvas'); c.width = o.width; c.height = o.height; const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(o, 0, 0); const A = g.getImageData(0, 0, o.width, o.height).data;
  g.imageSmoothingQuality = 'high'; g.drawImage(n, 0, 0, o.width, o.height); const B = g.getImageData(0, 0, o.width, o.height).data;
  let s = 0; for (let i = 0; i < A.length; i += 4) s += Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
  const mean = s / (A.length / 4) / 3;
  const w = Math.min(n.width, ${maxW}), h = Math.round(n.height * w / n.width);
  const e = document.createElement('canvas'); e.width = w; e.height = h; const eg = e.getContext('2d'); eg.imageSmoothingQuality = 'high'; eg.drawImage(n, 0, 0, w, h);
  const blob = await new Promise((r) => e.toBlob(r, 'image/webp', 0.86));
  const bytes = new Uint8Array(await blob.arrayBuffer()); let bin = ''; for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
  return JSON.stringify({ ow: o.width, oh: o.height, rw: n0.width, rh: n0.height, nw: n.width, nh: n.height, mean, w, h, b64: btoa(bin) });
})()`);

const done = [];
for (const name of names) {
  const src = path.join(ROOT, 'dist/assets/img', name);
  if (!fs.existsSync(src)) { console.log('SKIP', name, '(not in dist/assets/img)'); continue; }
  if (/a1b72014|logo|carecredit|acuvue|coopervision|bandl|nightstar/i.test(name)) { console.log('SKIP', name, '(excluded: real person, brand mark or practice premises)'); continue; }
  try {
    process.stdout.write(name.slice(0, 50) + ' … ');
    blobs.set('/o0/' + name, fs.readFileSync(src));
    const dims = JSON.parse(await pg.eval(`(async()=>{const b=await (await fetch('/o0/${name}')).blob();const i=await createImageBitmap(b);return JSON.stringify([i.width,i.height])})()`));
    const [asp, , aspDrift] = nearestAspect(dims[0], dims[1]);
    if (aspDrift > MAX_ASPECT_DRIFT) { record.rejected[name] = { why: 'no allowed output frame within 3% of its ' + dims.join('x') + ' shape (closest ' + asp + ')', at: new Date().toISOString() }; fs.writeFileSync(RECORD, JSON.stringify(record, null, 1)); console.log('SKIP (no matching frame, closest ' + asp + ' off by ' + (aspDrift * 100).toFixed(1) + '%)'); continue; }
    const url = await upload(src);
    const res = await enhance(url, asp);
    blobs.set('/o/' + name, fs.readFileSync(src)); blobs.set('/n/' + name, res.buf);
    const m = JSON.parse(await compareAndEncode('/o/' + name, '/n/' + name, MAX_W));
    const drift = Math.abs((m.rw / m.rh) / (m.ow / m.oh) - 1);
    const meta = { model: MODEL, request_id: res.request_id, aspect: asp, from: [m.ow, m.oh], returned: [m.rw, m.rh], cropped: [m.nw, m.nh], meanDiff: Math.round(m.mean * 100) / 100, aspectDrift: Math.round(drift * 10000) / 10000, at: new Date().toISOString() };
    if (m.mean > MAX_MEAN_DIFF || drift > MAX_ASPECT_DRIFT || m.nw <= m.ow) {
      record.rejected[name] = { ...meta, why: m.nw <= m.ow ? 'not larger than the original' : drift > MAX_ASPECT_DRIFT ? 'aspect changed' : 'too different from the original' };
      fs.writeFileSync(path.join(OUT, 'REJECTED-' + name.replace(/\.webp$/, '') + '.' + (res.buf[0] === 0x89 ? 'png' : 'jpg')), res.buf);
      console.log('REJECTED', record.rejected[name].why, JSON.stringify(meta));
    } else {
      const file = 'assets/enhanced/' + name; fs.writeFileSync(path.join(ROOT, file), Buffer.from(m.b64, 'base64'));
      record.images[name] = { file, to: [m.w, m.h], ...meta }; delete record.rejected[name];
      console.log('OK', m.ow + 'x' + m.oh, '->', m.w + 'x' + m.h, 'meanDiff', meta.meanDiff, 'drift', meta.aspectDrift);
      done.push(name);
    }
    fs.writeFileSync(RECORD, JSON.stringify(record, null, 1));
  } catch (e) { console.log('FAILED', e.message); }
}
pg.close(); br.close(); srv.close();
console.log('enhanced', done.length, 'of', names.length);
process.exit(0);
