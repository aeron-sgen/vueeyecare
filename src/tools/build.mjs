// Vue Eyecare rebuild generator.
//   STRUCTURE  Eye Trends information architecture (src/tools/routes.mjs; fresh crawl in structure-eyetrends/)
//   CONTENT    Vue Eyecare, from browser-rendered evidence (audit/content-blocks/*.json) + facts/client-facts.json
//   DESIGN     src/tools/design.mjs (chrome + page templates) + home.mjs + src/styles/* (design C "Iris Editorial").
//              Earlier designs A2/B2 live in ../vue-eyecare and ../vue-eyecare-b; this project was started over from fresh crawls.
// Writes dist/. Node builtins only. Adapted from the Briargrove generator (eyetrends-reforge/briargrove); the
// source here is EyeCarePro's newer PatientEngage platform (cdn.patientengage.cloud), not WordPress.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ROUTES, REMOVALS, ALIASES, LIVE_FORMS, SOURCE_ART, REIMAGE, SITE, SITE_HOST } from './routes.mjs';
import * as D from './design.mjs';
import { renderHome } from './home.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const DIST = path.join(ROOT, 'dist');
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
const inv = J('audit/site-inventory.json');
const content = J('audit/content-inventory.json');
const seo = J('audit/seo-inventory.json');
const images = J('audit/image-inventory.json');
const facts = J('facts/client-facts.json');

// ── helpers ──────────────────────────────────────────────────────────────────
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const norm = (u) => { try { const x = new URL(u, SITE); return (x.pathname.replace(/\/+$/, '') || '/'); } catch { return null; } };
const isSite = (u) => { try { const x = new URL(u, SITE); return SITE_HOST.test(x.hostname); } catch { return false; } };

// ── route table ──────────────────────────────────────────────────────────────
const byFrom = new Map(ROUTES.map(([from, to, group]) => [from, { to, group }]));
export const pages = [];
const removed = [];
const routeMap = {};
const redirects = [];
for (const p of inv.pages) {
  const from = norm(p.url);
  let r = byFrom.get(from);
  if (!r) {
    const rm = REMOVALS.find(([re]) => re.test(from));
    if (rm) { removed.push({ url: p.url, why: rm[1], to: rm[2] }); redirects.push([from, rm[2]]); continue; }
    throw new Error('crawled page has no route in routes.mjs: ' + from);
  }
  const file = r.to === '/' ? 'index.html' : r.to.replace(/^\//, '') + '/index.html';
  const base = (p.savedAs || 'index.html').replace(/\.html?$/, '');
  pages.push({ url: p.url, from, to: r.to, group: r.group, file, base });
  routeMap[p.url] = file;
  if (from !== r.to) redirects.push([from, r.to]);
}
for (const [from] of ROUTES) if (!pages.some((p) => p.from === from)) throw new Error('ROUTES entry has no crawled page: ' + from);
const toByFrom = new Map(pages.map((p) => [p.from, p.to]));
const removedTo = new Map(removed.map((r) => [norm(r.url), r.to]));
const removedSet = new Set(removedTo.keys());
for (const [alias, target] of Object.entries(ALIASES)) {
  const to = toByFrom.get(target);
  if (!to) throw new Error('ALIASES target is not a built page: ' + alias + ' -> ' + target);
  redirects.push([alias, to]);
}

// Briargrove's mis-hosted-link repair is not needed here (no Vue page links its own pages on a foreign host);
// the hook stays so the shared generator shape is unchanged. MISHOSTED never matches.
const HOST_FIXES = [];
const MISHOSTED = /^(?!)/;
export function rewriteHref(href) {
  if (!href) return href;
  if (/^(tel:|mailto:|#|javascript:)/i.test(href)) return /^javascript:/i.test(href) ? '#' : href;
  const mis = href.match(MISHOSTED);
  if (mis) {
    const p = mis[1].replace(/\/+$/, '') || '/';
    if (toByFrom.has(p) || ALIASES[p]) { HOST_FIXES.push({ from: href, to: SITE + mis[1] }); href = SITE + mis[1]; }
  }
  if (!isSite(href) && /^https?:/i.test(href)) return href;
  let u; try { u = new URL(href, SITE); } catch { return href; }
  const p0 = u.pathname.replace(/\/+$/, '') || '/';
  const p = ALIASES[p0] || p0;
  if (/\/wp-content\//.test(p)) return href;
  const to = toByFrom.get(p) || removedTo.get(p) || null;
  if (to) return to === '/' ? '/' : to + '/' + (u.hash || '');
  return p + (u.hash || '');
}

// ── images ───────────────────────────────────────────────────────────────────
// PatientEngage serves width variants as "<name>.<ext>@w_<n>.<ext2>" and googleapis as "<name>___responsive_<w>_<h>.<ext>";
// both collapse to "<name>" (no extension), so every variant of one photo shares a stem and the widest download wins.
const stem = (u) => { try { return decodeURIComponent(path.basename(new URL(u, SITE).pathname)).replace(/@w_\d+\.\w+$/, '').replace(/___responsive_\d+_\d+\.\w+$/, '').replace(/\.(jpe?g|png|webp|gif|svg)$/i, '').toLowerCase(); } catch { return ''; } };
const imgBySrc = new Map();
const imgByStem = new Map();
for (const im of images.images) {
  if (!im.localFile) continue;
  imgBySrc.set(im.src, im);
  const s = stem(im.src); const cur = imgByStem.get(s);
  if (!cur || (im.intrinsicWidth || 0) > (cur.intrinsicWidth || 0)) imgByStem.set(s, im);
}
const copied = new Set();
export const imageUse = [];
export const ART = {};
// Generated lifestyle art (src/tools/generate-art.mjs; prompts in audit/generated-art.json): slot 'g-*'.
// It fills topic pages that have no photo of their own and replaces the source's stock photos (REIMAGE);
// real practice photography keeps the practice pages. Loaded first so localImage() can swap to it.
const GEN_RECORD = path.join(ROOT, 'audit/generated-art.json');
const GEN = fs.existsSync(GEN_RECORD) ? JSON.parse(fs.readFileSync(GEN_RECORD, 'utf8')).images : {};
for (const [slot, g] of Object.entries(GEN)) {
  // shared slots plus this design's own (design.mjs ART_GROUP); the other design's art is never shipped
  if (g.group && g.group !== 'shared' && g.group !== D.ART_GROUP) continue;
  const from = path.join(ROOT, g.file);
  if (!fs.existsSync(from)) throw new Error('generated art ' + slot + ': ' + g.file + ' is missing (run src/tools/generate-art.mjs)');
  const name = slot + '.jpg', out = path.join(DIST, 'assets/img', name);
  if (!copied.has(name)) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.copyFileSync(from, out); copied.add(name); }
  ART[slot] = { src: '/assets/img/' + name, w: g.width, h: g.height, alt: '' };
}
const imgByFile = new Map(images.images.filter((i) => i.localFile).map((i) => [path.basename(i.localFile), i]));
// REIMAGE keys are source image STEMS (every downloaded width variant of one photo swaps together)
for (const [file, [slot]] of Object.entries(REIMAGE)) {
  if (!imgByStem.has(file.toLowerCase()) && !imgByFile.has(file)) throw new Error('REIMAGE ' + file + ': not a downloaded source image');
  if (!ART[slot]) throw new Error('REIMAGE ' + file + ': no generated slot ' + slot);
}
export const reimaged = new Set();
const UP_RECORD = path.join(ROOT, 'audit/upscaled.json');
const UPSCALED = fs.existsSync(UP_RECORD) ? JSON.parse(fs.readFileSync(UP_RECORD, 'utf8')).images : {};
for (const [name, u] of Object.entries(UPSCALED)) if (!fs.existsSync(path.join(ROOT, u.file))) throw new Error('upscaled ' + name + ': ' + u.file + ' is missing (run src/tools/upscale.mjs)');
export function localImage(src) {
  const im = imgBySrc.get(src) || imgByStem.get(stem(src));
  if (!im) return null;
  const name = path.basename(im.localFile);
  const st = stem(im.src);
  const swap = REIMAGE[st] || REIMAGE[name];
  // a swapped photo keeps the ORIGINAL's width for layout decisions (hero promotion, small figures), so the
  // page is laid out exactly as the source was; its alt text describes the new photo, not the old one
  if (swap) { reimaged.add(st); return { ...ART[swap[0]], alt: swap[1], role: im.role, layoutW: im.intrinsicWidth, reimaged: true }; }
  const out = path.join(DIST, 'assets/img', name);
  // an upscaled copy (src/tools/upscale.mjs) replaces the small source file under the same URL; layout
  // decisions keep the source's width so the page is laid out as before, only sharper
  const up = UPSCALED[name];
  if (!copied.has(name)) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.copyFileSync(up ? path.join(ROOT, up.file) : path.join(ROOT, im.localFile), out); copied.add(name); }
  if (up) return { src: '/assets/img/' + name, w: up.to[0], h: up.to[1], layoutW: im.intrinsicWidth, alt: (im.alts || [])[0] || '', role: im.role };
  return { src: '/assets/img/' + name, w: im.intrinsicWidth, h: im.intrinsicHeight, alt: (im.alts || [])[0] || '', role: im.role };
}
for (const [key, st] of Object.entries(SOURCE_ART)) {
  const im = imgByStem.get(st.toLowerCase());
  if (!im) throw new Error('SOURCE_ART ' + key + ': ' + st + ' is not a downloaded source image');
  const li = localImage(im.src);
  ART[key] = { src: li.src, w: li.w, h: li.h, alt: '' };
}
const RMAN_FILE = path.join(ROOT, 'assets/responsive/manifest.json');
const RMAN = fs.existsSync(RMAN_FILE) ? JSON.parse(fs.readFileSync(RMAN_FILE, 'utf8')) : {};
const usedVariants = new Set();
export function webpAt(src, w) {
  const m = RMAN[src]; if (!m) return src;
  const v = m.variants.find(([vw]) => vw >= w) || m.variants[m.variants.length - 1];
  usedVariants.add(v[1]); return v[1];
}
// Decorative art direction per section of the IA, used only where a page has no photo of its own near the
// top; alt="" because the image carries no information. Every slot is one of the SOURCE's own images.
const GROUP_ART = {
  practice: 'exam', insurance: 'insurance', services: 'family', 'svc-exams': 'family', 'svc-kids': 'kids',
  'svc-medical': 'senior', 'svc-emergency': 'emergency', 'svc-contacts': 'contact-exam', eyewear: 'frames',
  legal: null, home: 'friends',
};
const PAGE_ART = {
  '/our-doctor/dr-pt-dinh': 'doctor', '/contact': 'outdoors', '/products/promotions': 'frames', '/eye-doctor-baton-rouge/hours': 'outdoors',
  '/products/contact-lenses/hard-to-fit': 'contact-finger', '/products/contact-lenses/eye-exams-for-contacts': 'contact-exam',
  '/eye-doctor-baton-rouge': 'outdoors', '/services/dry-eye-treatment': 'screen', '/services/lasik-co-management': 'man-glasses',
  '/services/toric-contacts': 'contact-finger', '/products/contact-lenses': 'contacts', '/insurance/carecredit': 'hug',
};
for (const [to, key] of Object.entries(PAGE_ART)) if (!ART[key]) throw new Error('PAGE_ART ' + to + ': no art slot ' + key);
for (const to of Object.keys(PAGE_ART)) if (!pages.some((p) => p.to === to)) throw new Error('PAGE_ART ' + to + ': no such page');
for (const [g, key] of Object.entries(GROUP_ART)) if (key && !ART[key]) throw new Error('GROUP_ART ' + g + ': no art slot ' + key);
export function articleArt() { return 'family'; }

// logo ink boxes (audit/logo-ink.json from src/tools/logo-ink.mjs): used to balance logo walls
const LOGO_INK = fs.existsSync(path.join(ROOT, 'audit/logo-ink.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/logo-ink.json'), 'utf8')).logos : {};
const r3 = (x) => Math.round(x * 1000) / 1000;

// ── inline markup from the extractor ─────────────────────────────────────────
export function inline(s) {
  let h = esc(s);
  h = h.replace(/\[\[a href=&quot;(.*?)&quot;\]\]/g, (_, href) => {
    const raw = href.replace(/&amp;/g, '&');
    const r = rewriteHref(raw);
    const ext = /^https?:/i.test(r) && !isSite(r);
    return '<a href="' + esc(r) + '"' + (ext ? ' rel="noopener" target="_blank"' : '') + '>';
  }).replace(/\[\[\/a\]\]/g, '</a>')
    .replace(/\[\[b\]\]/g, '<strong>').replace(/\[\[\/b\]\]/g, '</strong>')
    .replace(/\[\[i\]\]/g, '<em>').replace(/\[\[\/i\]\]/g, '</em>')
    .replace(/\[\[br\]\]/g, '<br>')
    // a link whose only content was an image that could not be carried is empty: no accessible name
    .replace(/<a\b[^>]*>\s*<\/a>/g, '');
  return h.trim();
}

// ── practice facts used by the chrome ────────────────────────────────────────
export const BOOK = facts.links.book;                    // Adit scheduler: every Schedule Appointment button on the source
export const EXT = ' target="_blank" rel="noopener"';
export const PHONE_NAP = facts.phone[0];                 // footer / NAP / JSON-LD / every tel: link
// The source header button is LABELLED "(303) 979-4505" but dials tel:+12257522419 (a label defect, see
// facts.sourceDefects); the rebuild labels it with the number it actually calls.
export const PHONE_CALL = facts.phone[0];
export const tel = (p) => 'tel:+1' + p.replace(/\D/g, '').slice(-10);
const A = facts.addresses[0];
export const ADDRESS_LINE = A.street + ', ' + A.city + ', ' + A.region + ' ' + A.postal;

// Navigation: the Eye Trends mega-menu shape (exam / kids / medical / emergency / contacts groups, four
// eyewear cards, practice + patients lists), filled with Vue Eyecare's own pages and the source's own labels.
export const NAV = {
  services: [
    ['Comprehensive Eye Exams', [['/services/comprehensive-eye-exams', 'Comprehensive Eye Exams']]],
    ["Children's Eye Care", [['/services/myopia-management', 'Myopia Management']]],
    ['Medical Eye Care', [['/services/medical-eye-care', 'Eye Disease Management'], ['/services/dry-eye-treatment', 'Dry Eyes'], ['/services/glaucoma-management', 'Glaucoma Testing & Treatment'], ['/services/diabetic-eye-exams', 'Diabetic Eye Disease'], ['/services/macular-degeneration', 'Macular Degeneration'], ['/services/cataract-co-management', 'Cataract Surgery Co-Management'], ['/services/lasik-co-management', 'LASIK & Refractive Surgery Co-Management'], ['/services/eye-conditions', 'Eye Condition Treatment']]],
    ['Emergency Eye Care', [['/services/emergency-eye-care', 'Eye Emergencies (Pink/Red Eyes)']]],
    ['Contact Lens Exams', [['/services/contact-lens-exams', 'Contact Lens Exams'], ['/services/specialty-contacts', 'Hard to Fit Contacts'], ['/services/toric-contacts', 'Toric Contact Lenses']]],
  ],
  // Eye Trends' four eyewear cards, filled with the eyewear pages Vue actually has
  eyewear: [
    ['/products/designer-frames', 'Eyeglasses', 'frames'],
    ['/products/contact-lenses', 'Contact Lenses', 'contacts'],
    ['/products/contact-lenses/hard-to-fit', 'Hard-to-Fit Contacts', 'contact-finger'],
    ['/products/promotions', 'Promotions', 'man-glasses'],
  ],
  practice: [['/our-doctor', 'Our Eye Doctor'], ['/our-doctor/dr-pt-dinh', 'P.T. Dinh, OD, MS, IACMM'], ['/reviews', 'Patient Reviews'], ['/contact', 'Contact Us']],
  patients: [['/insurance', 'Insurance'], ['/insurance/carecredit', 'CareCredit'], ['/insurance/vision-insurance-faqs', 'FAQs of Vision Insurance Plans'], ['/insurance/whats-in-your-vision-plan', 'What’s in Your Vision Insurance Plan']],
  visit: [['/eye-doctor-baton-rouge', 'Our Location'], ['/eye-doctor-baton-rouge/hours', 'Hours & Location']],
};

// Hours, de-duplicated: consecutive open days with identical hours collapse into one range row, and the
// closed days are listed as their own rows in week order (Wednesday sits mid-week at Briargrove).
export function hoursRows() {
  const days = facts.hoursStructured;
  const rows = [];
  for (let i = 0; i < days.length; i++) {
    const d = days[i]; const key = d.slots.join('|') || 'closed';
    const last = rows[rows.length - 1];
    if (last && last.key === key && days.indexOf(last.to) === i - 1) last.to = d;
    else rows.push({ from: d, to: d, key, slots: d.slots });
  }
  return rows;
}
export function hoursTable(cls = 'hours') {
  const range = (r) => r.from === r.to ? r.from.day : r.from.day + ' <span aria-hidden="true">–</span><span class="sr-only">to</span> ' + r.to.day;
  return '<table class="' + cls + '"><caption class="sr-only">Office hours</caption><tbody>'
    + hoursRows().map((r) => '<tr' + (r.slots.length ? '' : ' class="closed"') + '><th scope="row">' + range(r) + '</th><td>' + (r.slots.length ? r.slots.join('<br>') : 'Closed') + '</td></tr>').join('')
    + '</tbody></table>';
}

// the only inline script on the site; its hash is allowed by the Content-Security-Policy in dist/_headers
export const JS_FLAG = "document.documentElement.classList.add('js')";
// A page's own source meta description, by rebuild path ('' when the source left it as just the brand name).
export const metaOf = (to) => {
  const p = pages.find((x) => x.to === to); if (!p) return '';
  const d = ((seo.pages.find((x) => x.url === p.url) || {}).metaDescription || '').trim();
  return d === facts.brand ? '' : d;
};
// Eyebrow labels: the Eye Trends navigation labels each page sits under (structure, not claims).
const GROUP_LABEL = {
  practice: 'About Us', insurance: 'Insurance', services: 'Services', 'svc-exams': 'Comprehensive Eye Exams',
  'svc-kids': "Children's Eye Care", 'svc-medical': 'Medical Eye Care', 'svc-emergency': 'Emergency Eye Care',
  'svc-contacts': 'Contact Lens Exams', eyewear: 'Eyewear', legal: facts.brand,
};
export const labelOf = (page) => (/^\/(eye-doctor-baton-rouge|contact)(\/|$)/.test(page.to) ? 'Visit Us' : GROUP_LABEL[page.group] || facts.brand);
// Mega-menu promo panels (Eye Trends puts one in each mega menu): every string is the source's own words.
let PROMO = null;
const promo = () => {
  if (PROMO) return PROMO;
  const home = pages.find((p) => p.to === '/');
  const care = home && home.data && home.data.blocks.find((b) => b.t === 'h' && /^Quality Eye Care/.test(b.text.trim()));
  if (!care) throw new Error('promo: the home "Quality Eye Care" heading is missing from the evidence');
  const frames = pages.find((p) => p.to === '/products/designer-frames');
  PROMO = {
    services: { eyebrow: 'Services', h: care.text.replace(/\s+/g, ' ').trim(), p: metaOf('/services') },
    eyewear: { eyebrow: 'Eyewear', h: fullTitle(frames.h1), p: metaOf('/products/designer-frames') },
  };
  return PROMO;
};
const K = () => ({ esc, inline, rewriteHref, localImage, ART, webpAt, BOOK, EXT, PHONE_NAP, PHONE_CALL, tel, ADDRESS_LINE, A, NAV, hoursTable, hoursRows, facts, SITE, JS_FLAG, pages, imageUse, seo, content, metaOf, labelOf, PROMO: promo() });
export function layout(o) { return D.layout(o, K()); }

// ── blocks -> html ───────────────────────────────────────────────────────────
const imgDropped = [];
// The source's sidebar badge widget ("Schedule An Appointment / Patient History Form / Email Us") can
// reach the extraction as loose text with its links lost; it is rebuilt as real buttons.
const QUICK = {};
function blocksHtml(blocks, page) {
  const out = [];
  const self = page.to === '/' ? '/' : page.to + '/';
  for (const b of blocks) {
    if (b.t === 'h') {
      const l = Math.min(Math.max(b.level, 2), 4);
      const whole = b.html && /^\[\[a href="[^"]*"\]\][^[]*\[\[\/a\]\]$/.test(b.html.trim());
      out.push('<h' + l + (whole ? ' class="title-link"' : '') + '>' + (b.html ? inline(b.html) : esc(b.text)) + '</h' + l + '>');
    }
    else if (b.t === 'p') {
      if (/^\[\[a href="[^"]*"\]\]Home\[\[\/a\]\]\s*»/.test(b.html.trim())) continue;   // source breadcrumb line
      const q = b.loose && QUICK[b.html.trim()];
      if (q) { out.push('<a class="btn ' + q[1] + ' quick" href="' + q[0] + '"' + (q[2] ? EXT : '') + '>' + esc(b.html.trim()) + '</a>'); continue; }
      const h = inline(b.html); if (h) out.push('<p>' + h + '</p>');
    }
    else if (b.t === 'list') {
      const LINK = /^(?:\[\[b\]\])?\[\[a href="([^"]*)"\]\](.+?)\[\[\/a\]\](?:\[\[\/b\]\])?\s*([\s\S]*)$/;
      const strip = (s) => s.replace(/\[\[[^\]]*\]\]/g, '').trim();
      const clean = (i) => i.replace(/^(?:\[\[a href="[^"]*"\]\]\s*\[\[\/a\]\]\s*)+/, '');
      const dir = b.items.length >= 2 && b.items.every((i) => { const m = clean(i).match(LINK); return m && strip(m[2]) && strip(m[3]); });
      if (dir) {
        out.push('<ul class="link-cards">' + b.items.map((i) => {
          const m = clean(i).match(LINK);
          const href = rewriteHref(m[1]);
          if (href === self) return '';
          return '<li><a href="' + esc(href) + '"><b>' + esc(strip(m[2])) + '</b><span>' + esc(m[3].replace(/\[\[[^\]]*\]\]/g, '').trim()) + '</span><i aria-hidden="true">→</i></a></li>';
        }).join('') + '</ul>');
      } else {
        const cols = !b.ordered && b.items.length >= 8 && b.items.every((i) => i.replace(/\[\[[^\]]*\]\]/g, '').trim().length <= 40);
        out.push('<' + (b.ordered ? 'ol' : 'ul') + (cols ? ' class="cols"' : '') + '>' + b.items.map((i) => '<li>' + inline(i) + '</li>').join('') + '</' + (b.ordered ? 'ol' : 'ul') + '>');
      }
    }
    else if (b.t === 'btn') {
      if (!b.href) continue;
      const r = rewriteHref(b.href);
      const ext = /^https?:/i.test(r) && !isSite(r);
      out.push('<a class="btn ' + (/appointment|book|schedule/i.test(b.text) ? 'btn-primary' : 'btn-ghost') + ' quick" href="' + esc(r) + '"' + (ext ? EXT : '') + '>' + esc(b.text) + '</a>');
    }
    else if (b.t === 'quote') out.push('<blockquote>' + esc(b.text).replace(/\n+/g, '<br>') + '</blockquote>');
    else if (b.t === 'table') out.push('<div class="table-wrap"><table><tbody>' + b.rows.map((r) => '<tr>' + r.map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
    else if (b.t === 'embed') {
      const yt = b.src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/);
      if (yt) out.push('<div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/' + yt[1] + '" title="' + esc(b.title || 'Video') + '" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>');
      // the source map carries the old platform's Maps API key; use the keyless embed of the practice address
      else if (/google\.com\/maps/.test(b.src)) out.push('<div class="embed map"><iframe src="https://maps.google.com/maps?q=' + encodeURIComponent(facts.brand + ', ' + ADDRESS_LINE) + '&amp;output=embed" title="Map to ' + esc(facts.brand) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>');
      else imgDropped.push({ page: page.url, src: b.src, why: 'embed with no local alternative and not a video/map: omitted' });
    }
    else if (b.t === 'img') {
      const li = localImage(b.src);
      if (!li) { imgDropped.push({ page: page.url, src: b.src, why: 'image not available locally (see audit/failures.json)' }); continue; }
      imageUse.push({ page: page.to, src: li.src });
      const lw = li.layoutW || li.w;
      const small = (lw && lw <= 420) || (b.shownW && b.shownW <= 320);
      const isLogo = /logo/i.test(b.src + b.alt) || li.role === 'LOGO/BRAND';
      const sizes = isLogo || small ? '(max-width: 640px) calc(100vw - 48px), 260px' : '(max-width: 760px) calc(100vw - 48px), 720px';
      const imgTag = '<img src="' + li.src + '" alt="' + esc(li.reimaged ? li.alt : (b.alt || li.alt)) + '"' + (li.w ? ' width="' + li.w + '" height="' + li.h + '"' : '') + ' loading="lazy" decoding="async" sizes="' + sizes + '">';
      // logos measured by src/tools/logo-ink.mjs are cropped to their ink and sized to equal visual area (as on home)
      const ink = (isLogo || small) && LOGO_INK[path.basename(li.src)];   // only logo files are in LOGO_INK
      const inner = ink ? '<span class="logo-ink" style="--ar:' + r3(ink.iw / ink.ih) + ';--lw:' + Math.min(140, Math.round(62 * Math.sqrt(ink.iw / ink.ih))) + ';--sw:' + r3(ink.w / ink.iw * 100) + '%;--sh:' + r3(ink.h / ink.ih * 100) + '%;--sx:' + r3(-ink.x / ink.iw * 100) + '%;--sy:' + r3(-ink.y / ink.ih * 100) + '%">' + imgTag + '</span>' : imgTag;
      out.push('<figure class="' + (isLogo ? 'logo small' : small ? 'small' : '') + '">' + inner + '</figure>');
    }
  }
  const grouped = [];
  for (let i = 0; i < out.length;) {
    let j = i;
    while (j < out.length && out[j].startsWith('<a class="btn') && out[j].includes(' quick"')) j++;
    if (j > i) { grouped.push('<div class="quick-links">' + out.slice(i, j).join('') + '</div>'); i = j; continue; }
    // a run of brand / insurance logos becomes one tile wall (each logo was its own full-width block before)
    // small PNG figures sitting in a run with real logos are brand marks too (Acuvue, CooperVision)
    while (j < out.length && (out[j].startsWith('<figure class="logo small">') || (out[j].startsWith('<figure class="small">') && /.png/i.test(out[j])))) j++;
    if (j - i >= 3 && out.slice(i, j).some((x) => x.startsWith('<figure class="logo small">'))) { grouped.push('<div class="logo-wall">' + out.slice(i, j).join('').replace(/<figure class="small">/g, '<figure class="logo small">').replace(/ sizes="[^"]*"/g, ' sizes="160px"') + '</div>'); i = j; continue; }
    j = i;
    while (j < out.length && out[j].startsWith('<figure class="">')) j++;
    if (j - i >= 3) { grouped.push('<div class="gallery">' + out.slice(i, j).join('').replace(/ sizes="[^"]*"/g, ' sizes="(max-width: 640px) calc(50vw - 30px), 240px"') + '</div>'); i = j; }
    else { grouped.push(out[i]); i++; }
  }
  return grouped.join('\n');
}

// ── forms ────────────────────────────────────────────────────────────────────
// The source forms are Gravity Forms behind a domain-bound reCAPTCHA (LIVE_FORMS in routes.mjs): the
// rebuild keeps the form's own intro copy and hands off to the live form.
// Below the handoff, the source form itself is rebuilt field for field (labels, choices, country list), so
// its content is preserved and it is ready for a processor: until one is configured (docs/DEPLOY.md) site.js
// blocks submission with an explanation instead of posting into a void.
function formFields(form, kind) {
  const groups = [];
  for (const f of form.fields) {
    if (!f.name || /g-recaptcha|captcha/i.test(f.name + f.group) || /validation purposes/i.test(f.desc)) continue;
    const base = f.name.replace(/\[\]$/, '').replace(/\.\d+$/, '');
    let g = groups.find((x) => x.base === base);
    if (!g) { g = { base, section: f.section, label: f.group || f.label, desc: f.desc, required: false, inputs: [] }; groups.push(g); }
    g.required = g.required || f.required;
    g.inputs.push(f);
  }
  let n = 0; let section = null; const out = [];
  const idOf = () => kind + '-' + (n++);
  for (const g of groups) {
    if (g.section && g.section !== section) { section = g.section; out.push('<h3 class="full">' + esc(section) + '</h3>'); }
    const req = g.required ? ' required' : '';
    const star = g.required ? ' <span aria-hidden="true">*</span>' : '';
    const hint = g.desc ? '<p class="hint">' + esc(g.desc) + '</p>' : '';
    const first = g.inputs[0];
    if (first.type === 'radio' || first.type === 'checkbox') {
      out.push('<fieldset class="full"><legend>' + esc(g.label) + star + '</legend><div class="opts">' + g.inputs.map((f) => '<label><input type="' + f.type + '" name="' + esc(f.name) + '" value="' + esc(f.value || f.choice) + '"' + (f.type === 'radio' && g.required ? ' required' : '') + '> ' + esc(f.choice || f.value) + '</label>').join('') + '</div>' + hint + '</fieldset>');
      continue;
    }
    if (g.inputs.length > 1) {
      out.push('<fieldset class="full"><legend>' + esc(g.label) + star + '</legend><div class="form-sub">' + g.inputs.map((f) => {
        const id = idOf(); const lab = esc(f.sub || f.label || g.label);
        if (f.tag === 'select') return '<div><label for="' + id + '">' + lab + '</label><select id="' + id + '" name="' + esc(f.name) + '">' + (f.options || []).map((o) => '<option>' + esc(o) + '</option>').join('') + '</select></div>';
        return '<div><label for="' + id + '">' + lab + '</label><input id="' + id + '" type="' + (f.type === 'number' ? 'number' : 'text') + '" name="' + esc(f.name) + '"' + (f.required ? ' required' : '') + '></div>';
      }).join('') + '</div>' + hint + '</fieldset>');
      continue;
    }
    const id = idOf(); const f = first;
    const lab = '<label for="' + id + '">' + esc(g.label) + star + '</label>';
    if (f.tag === 'select') out.push('<div>' + lab + '<select id="' + id + '" name="' + esc(f.name) + '"' + req + '>' + (f.options || []).map((o) => '<option>' + esc(o) + '</option>').join('') + '</select>' + hint + '</div>');
    else if (f.tag === 'textarea') out.push('<div class="full">' + lab + '<textarea id="' + id + '" name="' + esc(f.name) + '"' + req + '></textarea>' + hint + '</div>');
    else {
      const type = f.type === 'email' || /email/i.test(g.label) ? 'email' : f.type === 'tel' || /phone/i.test(g.label) ? 'tel' : f.type === 'number' ? 'number' : 'text';
      out.push('<div>' + lab + '<input id="' + id + '" type="' + type + '" name="' + esc(f.name) + '"' + req + '>' + hint + '</div>');
    }
  }
  // the source's spam honeypot keeps its own label and note (hidden from people, filled by bots)
  const hpF = form.fields.find((f) => /validation purposes/i.test(f.desc));
  const hpLabel = hpF ? (hpF.group || hpF.label || 'Phone') : 'Phone';
  const hpHint = hpF ? '<p class="hint">' + esc(hpF.desc) + '</p>' : '';
  const endpoint = '/api/' + (kind === 'registration' ? 'patient-registration' : 'contact');
  return '<form class="form" method="post" action="' + endpoint + '" data-needs-backend="' + endpoint + '">\n'
    + '<p class="notice full">Online submission from this page is not connected yet. Use the button above, or call <a href="' + tel(PHONE_NAP) + '">' + esc(PHONE_NAP) + '</a>.</p>\n'
    + out.join('\n')
    + '\n<div class="hp" aria-hidden="true"><label for="' + kind + '-hp">' + esc(hpLabel) + '</label><input id="' + kind + '-hp" name="hp_field" type="text" tabindex="-1" autocomplete="off">' + hpHint + '</div>'
    + '\n<div class="full"><button class="btn btn-primary" type="submit">Submit</button></div>\n</form>';
}
function formHtml(form, kind) {
  const sectionTitles = new Set(form.fields.map((f) => f.section).filter(Boolean));
  const intro = [...(form.intro || []), ...(form.sections || []).filter((t) => !sectionTitles.has(t))];
  const introHtml = intro.map((t) => '<p>' + esc(t).replace(/\n+/g, '</p><p>') + '</p>').join('');
  const name = kind === 'registration' ? 'Patient Registration Form' : 'Contact Form';
  return introHtml + D.formHandoff({ name, href: LIVE_FORMS[kind], kind }, K()) + formFields(form, kind);
}

// ── interior page ────────────────────────────────────────────────────────────
function crumbs(page, title) {
  const parts = page.to.split('/').filter(Boolean);
  const items = [['/', 'Home']];
  let acc = '';
  for (let k = 0; k < parts.length - 1; k++) {
    acc += '/' + parts[k];
    const hit = pages.find((p) => p.to === acc);
    // full title, never a "…" truncation (that fabricates a string the source never had); CSS clamps it
    if (hit) items.push([acc + '/', hit.h1 ? fullTitle(hit.h1) : parts[k]]);
  }
  items.push([null, title]);
  return '<nav class="crumbs" aria-label="Breadcrumb"><ol>' + items.map(([h, t]) => '<li>' + (h ? '<a href="' + h + '">' + esc(t) + '</a>' : '<span aria-current="page">' + esc(t) + '</span>') + '</li>').join('') + '</ol></nav>';
}
function siblings(page) {
  const parent = page.to.split('/').slice(0, -1).join('/') || '/';
  const hub = page.group === 'article' || page.group === 'library' ? '/eye-health' : parent;
  let list = pages.filter((p) => p !== page && p.to.startsWith(page.to + '/') && p.to.split('/').length === page.to.split('/').length + 1);
  if (!list.length) list = pages.filter((p) => p.to.split('/').slice(0, -1).join('/') === parent && p.to !== '/');
  if (page.group === 'article') list = pages.filter((p) => p.group === 'article');
  if (page.to === '/') list = [];
  const hubPage = pages.find((p) => p.to === hub);
  return { hubPage, list: list.slice(0, 14) };
}

// ── reviews ──────────────────────────────────────────────────────────────────
// The 20 patient reviews: full text, author and rating from the home page's JSON-LD LocalBusiness.review[]
// (facts/client-facts.json, written by src/tools/facts.mjs). The visible source widget shows the same reviews,
// truncating long ones behind "Show More"; the cards show the full text and clamp it visually only.
let REVIEWS = null;
export function reviews() {
  if (REVIEWS) return REVIEWS;
  REVIEWS = facts.testimonials.map((t) => ({ title: null, text: t.text.split(/\n+/).map((x) => esc(x.trim())).filter(Boolean), author: t.author, via: null, rating: t.rating, href: null }));
  return REVIEWS;
}
// Card markup belongs to the design (design.mjs reviewCard); this fallback keeps a design without one working.
function defaultReviewCard(r, k, { tag = 'h3', link = true } = {}) {
  return '<li class="review-card"><figure>'
    + '<blockquote>' + r.text.map((t) => '<p>' + t + '</p>').join('') + '</blockquote>'
    + '<figcaption>' + esc(r.author) + '</figcaption></figure></li>';
}
export const reviewCard = (r, opts) => (D.reviewCard || defaultReviewCard)(r, K(), opts);

function interior(page, data) {
  const s = seo.pages.find((x) => x.url === page.url) || {};
  const c = content.pages.find((x) => x.url === page.url) || {};
  const blocks = data.blocks.slice();
  const h1i = blocks.findIndex((b) => b.t === 'h' && b.level === 1);
  // H1 text from the static source DOM: the rendered innerText carries the old theme's CSS uppercase
  const h1 = (c.h1 && c.h1[0]) || (h1i >= 0 ? blocks[h1i].text : data.title.split('|')[0].trim());
  if (h1i >= 0) blocks.splice(h1i, 1);
  // Location pages (Visit Us + Hours): the source's hours widget arrives as one run-together line ("monday: 8:00 am
  // - 4:30 pmtuesday: …") and its reviews widget as loose paragraphs (each long review twice: teaser + full, star
  // rows as separate lines, no names). Both are rebuilt from the same source data: the hours as a full day-by-day
  // table beside the map, the reviews as cards (text once, rating, author) from the source JSON-LD.
  let visit = null, reviewsBand = false;
  if (/^\/eye-doctor-baton-rouge(\/|$)/.test(page.to)) {
    const plain = (b) => (b.html || '').replace(/\[\[[^\]]*\]\]/g, '').replace(/\s+/g, ' ').trim();
    const squash = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const revKeys = facts.testimonials.map((t) => squash(t.text));
    const isStars = (b) => b.t === 'p' && /^(⭐️?)+$/u.test(plain(b));
    const isReview = (b) => b.t === 'p' && plain(b).length > 3 && revKeys.some((k) => k.startsWith(squash(plain(b)).replace(/\.+$/, '').slice(0, 60)));
    const hi = blocks.findIndex((b) => b.t === 'p' && /^monday:\s*\d/i.test(plain(b)));
    const mi = blocks.findIndex((b) => b.t === 'embed' && /google\.com\/maps/.test(b.src));
    if (hi >= 0 || mi >= 0) { visit = true; for (const i of [hi, mi].filter((x) => x >= 0).sort((a, b) => b - a)) blocks.splice(i, 1); }
    const revIdx = blocks.map((b, i) => (isStars(b) || isReview(b) ? i : -1)).filter((i) => i >= 0);
    if (revIdx.length >= 6) { reviewsBand = true; for (const i of revIdx.reverse()) blocks.splice(i, 1); }
  }
  const isTestimonial = page.from.startsWith('/testimonial/');
  const isReviews = page.to === '/reviews';
  let lead = '';
  const li = blocks.findIndex((b) => b.t === 'p');
  if (!isTestimonial && !isReviews && li >= 0 && li <= 2 && blocks[li].html.length < 420 && !/\[\[a /.test(blocks[li].html) && !(blocks[li].loose && QUICK[blocks[li].html.trim()])) { lead = inline(blocks[li].html); blocks.splice(li, 1); }
  let heroImg = null;
  const hi = blocks.findIndex((b) => b.t === 'img' && !/logo/i.test(b.src + b.alt));
  if (hi >= 0 && hi <= 4) { const l = localImage(blocks[hi].src); if (l && (l.layoutW || l.w) >= 380) { heroImg = { ...l, alt: l.reimaged ? l.alt : (blocks[hi].alt || l.alt), contain: (l.w < 700 && /\.(png|gif|svg)$/i.test(l.src)) || /diagram|icon/i.test(l.src) }; blocks.splice(hi, 1); imageUse.push({ page: page.to, src: l.src }); } }
  const artKey = PAGE_ART[page.to] || (page.group === 'article' ? articleArt(page.url + ' ' + h1) : GROUP_ART[page.group]);
  if (!heroImg && artKey) heroImg = { ...ART[artKey], alt: '' };
  // the source sometimes places the same photo twice near the top; once it is the hero, a repeat in the copy is dropped
  if (heroImg) for (let i = blocks.length - 1; i >= 0; i--) if (blocks[i].t === 'img') { const l = localImage(blocks[i].src); if (l && l.src === heroImg.src) blocks.splice(i, 1); }
  const kind = page.to === '/patient-forms' ? 'registration' : page.to === '/contact/email-us' ? 'contact' : null;
  const formBlock = kind && data.forms && data.forms[0] ? formHtml(data.forms[0], kind) : '';
  const { hubPage, list } = siblings(page);
  const title = fullTitle(h1);
  // Reviews as cards. /reviews: the six review groups (H2 title, text, attribution) are replaced, in place,
  // by a card grid. A testimonial post: its review is one card (no title in the card — the page H1 is the
  // title), carrying the "Testimonial · Rated N out of 5" line read from the post's hidden schema.
  let reviewHtml = null;
  if (isTestimonial) {
    const r = reviews().find((x) => x.href === page.to + '/');
    if (r) {
      const used = new Set([...r.text, r.attribution].map((t) => t.replace(/\[\[[^\]]*\]\]/g, '').replace(/\s+/g, ' ').trim()));
      for (let i = blocks.length - 1; i >= 0; i--) if (blocks[i].t === 'p' && used.has(blocks[i].html.replace(/\[\[[^\]]*\]\]/g, '').replace(/\s+/g, ' ').trim())) blocks.splice(i, 1);
      reviewHtml = '<ul class="review-cards single">' + reviewCard(r, { tag: null, link: false, label: 'Testimonial' }) + '</ul>';
    }
  }
  let proseHtml;
  if (isReviews && reviews().length) {
    const R = reviews();
    const first = blocks.findIndex((b) => b.t === 'h' && b.text.replace(/\s+/g, ' ').trim() === R[0].title);
    const lastAt = R[R.length - 1].attribution;
    const last = blocks.findIndex((b, i) => i > first && b.t === 'p' && b.html.replace(/\[\[[^\]]*\]\]/g, '').replace(/\s+/g, ' ').trim() === lastAt);
    if (first < 0 || last < 0) throw new Error('reviews: could not locate the review groups on /reviews');
    proseHtml = blocksHtml(blocks.slice(0, first), page) + '<ul class="review-cards">' + R.map((r) => reviewCard(r, { tag: 'h2', link: true })).join('') + '</ul>' + blocksHtml(blocks.slice(last + 1), page);
  } else proseHtml = (reviewHtml || '') + blocksHtml(blocks, page);
  // Related band (Eye Trends ends each page with one): pages in the same navigation group first, then the
  // section's other pages; each card carries the page's own source H1 and meta description. Legal pages get none.
  const relPool = [...pages.filter((p) => p !== page && p.group === page.group && p.to !== '/'), ...list.filter((p) => p !== page)];
  const related = page.group === 'legal' ? [] : [...new Set(relPool)].slice(0, 6);
  const body = D.interior({
    page, title, lead, heroImg, eyebrow: labelOf(page),
    prose: proseHtml + formBlock, splitBands: page.group !== 'legal',
    visit: visit ? { hours: facts.hoursStructured, mapQuery: facts.brand + ', ' + ADDRESS_LINE } : null,
    reviews: reviewsBand ? { heading: 'Patient Reviews', agg: facts.aggregateRating, cards: reviews().map((r) => reviewCard(r, { clamp: true })).join(''), more: facts.links.reviewsGoogle } : null,
    related: { heading: hubPage && hubPage.to !== '/' ? fullTitle(hubPage.h1) : 'In this section', hub: hubPage && hubPage.to !== '/' ? hubPage.to + '/' : null, links: related.map((p) => [p.to + '/', p.h1 ? fullTitle(p.h1) : p.to, metaOf(p.to)]) },
  }, K());
  return layout({
    title: s.title || data.title, description: s.metaDescription || data.description,
    canonical: SITE + (page.to === '/' ? '/' : page.to + '/'), body, current: page.to,
    ogImage: heroImg ? heroImg.src : null,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: page.to.split('/').filter(Boolean).map((seg, k, arr) => ({ '@type': 'ListItem', position: k + 1, name: k === arr.length - 1 ? h1 : seg, item: SITE + '/' + arr.slice(0, k + 1).join('/') + '/' })) }],
  });
}

function titleCase(t) {
  const s = String(t).toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(At|Of|And|The|For|In|To|A|An|Or|With)\b/g, (m) => m.toLowerCase());
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const ACRONYM = /^(LASIK|GP|UV|TX|OD|MS|IACMM|FAQS?|USA|II|III|AR|SOLFX|FSA|HSA)$/;
export function fullTitle(t) {
  const s = String(t).replace(/\s+/g, ' ').trim();
  if (s === s.toUpperCase() && /[A-Z]/.test(s)) return titleCase(s);
  const shouted = (s.match(/\b[A-Z]{2,}\b/g) || []).filter((w) => !ACRONYM.test(w));
  if (shouted.length < 2) return s;
  const out = s.replace(/\b[A-Z]{2,}\b/g, (w, i) => ACRONYM.test(w) ? w
    : (i > 0 && /^(AT|OF|AND|THE|FOR|IN|TO|A|AN)$/.test(w) ? w.toLowerCase() : w.charAt(0) + w.slice(1).toLowerCase()));
  return out.charAt(0).toUpperCase() + out.slice(1);
}
export function short(t) {
  const s = fullTitle(t);
  return s.length < 44 ? s : s.slice(0, 42).replace(/\s+\S*$/, '') + '…';
}

// ── build ────────────────────────────────────────────────────────────────────
const cp = (from, to) => { fs.mkdirSync(path.dirname(path.join(DIST, to)), { recursive: true }); fs.copyFileSync(path.join(ROOT, from), path.join(DIST, to)); };
cp('src/styles/tokens.css', 'styles/tokens.css');
cp('src/styles/site.css', 'styles/site.css');
// src/styles/motion.css is the verbatim inventory of the SOURCE site's keyframes (sr-motion); the redesign
// does not reuse the old platform's animations, so it is kept as the record and not shipped.
cp('src/scripts/site.js', 'scripts/site.js');
for (const f of fs.readdirSync(path.join(ROOT, 'src/assets/fonts'))) cp('src/assets/fonts/' + f, 'assets/fonts/' + f);
for (const f of fs.readdirSync(path.join(ROOT, 'src/assets/brand'))) cp('src/assets/brand/' + f, 'assets/brand/' + f);

const blocksOf = (p) => { const f = path.join(ROOT, 'audit/content-blocks', p.base + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
for (const p of pages) { const d = blocksOf(p); const h = d && d.blocks.find((b) => b.t === 'h' && b.level === 1); const ci = content.pages.find((x) => x.url === p.url); p.h1 = (ci && ci.h1 && ci.h1[0]) || (h ? h.text : (d ? d.title.split('|')[0].trim() : p.to)); p.shortTitle = short(p.h1); p.data = d; }
const missingEvidence = [];
for (const p of pages) {
  if (!p.data) { missingEvidence.push(p.url); continue; }
  const html = p.to === '/' ? renderHome(p, { ...K(), layout, fullTitle, short, D, reviews: reviews(), reviewCard }) : interior(p, p.data);
  const out = path.join(DIST, p.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html.replace(/href="(\/(?!\/)[^"#?]*)(#[^"]*)?"/g, (m, pth, hash) => { const n = pth.replace(/\/+$/, '') || '/'; if (toByFrom.has(n) || removedSet.has(n) || ALIASES[n]) return 'href="' + rewriteHref(n) + (hash || '') + '"'; return m; }));
}
// site search (replaces the source's WordPress search form): a static index + a results page
const searchIndex = pages.filter((p) => p.data).map((p) => {
  const text = p.data.blocks.filter((b) => b.t === 'p' || b.t === 'list').map((b) => (b.html || (b.items || []).join(' '))).join(' ').replace(/\[\[[^\]]*\]\]/g, '').replace(/\s+/g, ' ');
  return { u: p.to === '/' ? '/' : p.to + '/', t: p.to === '/' ? 'Home' : short(p.h1), d: (seo.pages.find((x) => x.url === p.url) || {}).metaDescription || '', x: text.slice(0, 1500) };
});
fs.writeFileSync(path.join(DIST, 'search-index.json'), JSON.stringify(searchIndex));
fs.mkdirSync(path.join(DIST, 'search'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'search/index.html'), layout({
  title: 'Search | ' + facts.brand, description: 'Search the ' + facts.brand + ' website.', canonical: SITE + '/search/', current: '/search',
  body: D.simplePage({ title: 'Search', html: '<form class="site-search big" role="search" action="/search/" method="get"><label class="sr-only" for="search-q">Search the site</label><div><input id="search-q" name="q" type="search" placeholder="Dry eye, contacts, insurance…" autocomplete="off"><button class="btn btn-primary" type="submit">Search</button></div></form>', after: '<div class="wrap section tight"><p id="search-status" class="muted" role="status"></p><ol id="search-results" class="search-results"></ol></div>' }, K()),
}));
fs.writeFileSync(path.join(DIST, '404.html'), layout({ title: 'Page not found | ' + facts.brand, description: '', canonical: SITE + '/404.html', current: '', body: D.simplePage({ title: 'Page not found', html: '<p class="lead">The page you were looking for has moved. Try the <a href="/services/">eye care services</a>, <a href="/products/">eyewear</a>, or <a href="/">home page</a>.</p>' }, K()) }));
fs.writeFileSync(path.join(DIST, '_redirects'), redirects.map(([f, t]) => f + '  ' + (t === '/' ? '/' : t + '/') + '  301').join('\n') + '\n');
// /reviews (ADD): Eye Trends has a reviews page; the source keeps its 20 reviews only in the home widget. This page
// shows all of them in full, with the source's own "Patient Reviews" heading and aggregate (JSON-LD), nothing else.
fs.mkdirSync(path.join(DIST, 'reviews'), { recursive: true });
const AGG = facts.aggregateRating;
fs.writeFileSync(path.join(DIST, 'reviews/index.html'), layout({
  title: 'Patient Reviews | ' + facts.brand, description: facts.brand + ' patient reviews: ' + AGG.ratingValue + ' out of 5 from ' + AGG.reviewCount + ' reviews.',
  canonical: SITE + '/reviews/', current: '/reviews',
  body: D.reviewsPage({ heading: 'Patient Reviews', agg: AGG, cards: reviews().map((r) => reviewCard(r, { clamp: false })).join(''), more: facts.links.reviewsGoogle }, K()),
}));
// /products (ADD): the Eye Trends "Eyewear" hub. Vue has no eyewear index page, so this one lists Vue's own
// eyewear pages only, each with its source H1 and source meta description; no new copy.
fs.mkdirSync(path.join(DIST, 'products'), { recursive: true });
const eyewearCards = NAV.eyewear.map(([href, label, art]) => {
  const p = pages.find((x) => x.to === href);
  if (!p) throw new Error('/products hub: no built page ' + href);
  const d = metaOf(href);   // empty when the source meta is only the brand name
  return { href: href + '/', title: fullTitle(p.h1), label, desc: d, img: ART[art] };
});
fs.writeFileSync(path.join(DIST, 'products/index.html'), layout({
  title: 'Eyewear | ' + facts.brand, description: eyewearCards.map((c) => c.label).join(', ') + ' at ' + facts.brand + ', ' + A.city + ', ' + A.region + '.',
  canonical: SITE + '/products/', current: '/products',
  body: D.hubPage({ heading: 'Eyewear', cards: eyewearCards }, K()),
}));
const sitemapUrls = [...pages.filter((p) => p.data).map((p) => (p.to === '/' ? '/' : p.to + '/')), '/products/', '/reviews/', '/search/'];
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + [...new Set(sitemapUrls)].map((u) => '  <url><loc>' + SITE + u + '</loc></url>').join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(DIST, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + SITE + '/sitemap.xml\n');

// Responsive images (src/tools/responsive.mjs writes the manifest): <img> -> <picture> with WebP srcset
const DEFAULT_SIZES = '(max-width: 760px) calc(100vw - 48px), 720px';
let pictures = 0;
const pictureize = (html) => html.replace(/<img\b([^>]*)>/g, (tag, attrs) => {
  const sz = attrs.match(/\ssizes="([^"]*)"/);
  const clean = sz ? attrs.replace(sz[0], '') : attrs;
  const m = RMAN[(attrs.match(/\bsrc="([^"]+)"/) || [])[1]];
  if (!m) return '<img' + clean + '>';
  m.variants.forEach(([, u]) => usedVariants.add(u));
  pictures++;
  return '<picture><source type="image/webp" srcset="' + m.variants.map(([w, u]) => u + ' ' + w + 'w').join(', ')
    + '" sizes="' + (sz ? sz[1] : DEFAULT_SIZES) + '"><img' + clean + '></picture>';
});
const htmlFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? htmlFiles(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
for (const f of htmlFiles(DIST)) fs.writeFileSync(f, pictureize(fs.readFileSync(f, 'utf8')));
for (const u of usedVariants) cp('assets/responsive/' + path.basename(u), u.slice(1));
export const CSP = "default-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; style-src 'self' 'unsafe-inline'; "
  + "script-src 'self' 'sha256-" + createHash('sha256').update(JS_FLAG).digest('base64') + "'; "
  + 'frame-src https://www.youtube-nocookie.com https://maps.google.com https://www.google.com; connect-src \'self\'; '
  + "form-action 'self'; base-uri 'self'; frame-ancestors 'self'";
fs.writeFileSync(path.join(DIST, '_headers'), ['/*', '  Strict-Transport-Security: max-age=31536000', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: strict-origin-when-cross-origin', '  X-Frame-Options: SAMEORIGIN', '  Content-Security-Policy: ' + CSP, '/assets/*', '  Cache-Control: public, max-age=2592000', ''].join('\n'));
fs.writeFileSync(path.join(ROOT, 'audit/route-map.json'), JSON.stringify(routeMap, null, 1));
fs.writeFileSync(path.join(ROOT, 'audit/build-report.json'), JSON.stringify({ generated: new Date().toISOString(), design: D.NAME, pages: pages.length, removed, redirects: redirects.length, imagesCopied: copied.size, imgDropped, missingEvidence, hostFixes: [...new Map(HOST_FIXES.map((x) => [x.from, x])).values()] }, null, 1));
console.log('[' + D.NAME + '] built', pages.length, 'pages · re-imaged', reimaged.size + '/' + Object.keys(REIMAGE).length, '· removed', removed.length, '· redirects', redirects.length, '· images', copied.size, '· dropped media', imgDropped.length, '· missing evidence', missingEvidence.length, '· <picture>', pictures, '· webp variants', usedVariants.size);
