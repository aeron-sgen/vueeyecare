// Extract ordered semantic content blocks from each rendered Vue Eyecare page (EyeCarePro PatientEngage DOM:
// main > section.cpt blocks; header and footer sit outside main).
// Reads audit/rendered/*.html (browser-rendered evidence), writes audit/content-blocks/*.json.
// Runs the extraction inside headless Chrome so the real DOM parser does the work.
// usage: node src/tools/extract-blocks.mjs <cdp.mjs path>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const { launch, newPage } = await import(pathToFileURL(process.argv[2]).href);
const REND = path.join(ROOT, 'audit/rendered');
const OUT = path.join(ROOT, 'audit/content-blocks');
fs.mkdirSync(OUT, { recursive: true });

const EXTRACT = String.raw`(() => {
  const root = document.querySelector('main#content article') || document.querySelector('main#content') || document.querySelector('main') || document.body;
  const skip = (el) => el.closest('.ecp-breadcrumbs, .breadcrumbs, nav, .ecp-sidebar, aside, form, script, style, noscript, .sharedaddy, .screen-reader-text, .sr-only, [aria-hidden=true], button');
  const txt = (el) => el.innerText.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const inline = (el) => {
    // keep links and strong/em as lightweight markup
    const walk = (n) => {
      if (n.nodeType === 3) return n.textContent.replace(/\s+/g, ' ');
      if (n.nodeType !== 1) return '';
      const t = n.tagName; const inner = [...n.childNodes].map(walk).join('');
      if (t === 'A' && n.getAttribute('href')) return '[[a href="' + n.getAttribute('href') + '"]]' + inner + '[[/a]]';
      if (t === 'STRONG' || t === 'B') return inner.trim() ? '[[b]]' + inner + '[[/b]]' : inner;
      if (t === 'EM' || t === 'I') return inner.trim() ? '[[i]]' + inner + '[[/i]]' : inner;
      if (t === 'BR') return '[[br]]';
      if (t === 'SCRIPT' || t === 'STYLE') return '';
      return inner;
    };
    return walk(el).replace(/\s+/g, ' ').trim();
  };
  const blocks = [];
  const seen = new Set();
  const HANDLED = /^(H[1-6]|P|UL|OL|IMG|BLOCKQUOTE|TABLE|IFRAME|VIDEO|DL)$/;
  const INLINE = /^(A|STRONG|B|EM|I|SPAN|BR|SMALL|SUP|SUB|U|MARK|ABBR)$/;
  // text that sits directly in a layout element (div/span) with no <p> around it: its own text nodes
  // plus inline children, never block children (those are visited on their own)
  const ownInline = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 || (n.nodeType === 1 && INLINE.test(n.tagName))).map((n) => {
    if (n.nodeType === 3) return n.textContent.replace(/\s+/g, ' ');
    const w = document.createElement('p'); w.appendChild(n.cloneNode(true)); return ' ' + inline(w) + ' ';
  }).join('').replace(/\s+/g, ' ').trim();
  const all = root.querySelectorAll('*');
  for (const el of all) {
    if (skip(el)) continue;
    if ([...seen].some((s) => s.contains(el))) continue;
    const t = el.tagName;
    // a stand-alone button link in the content (EyeCarePro a.ecp-button: "Alcon Products", "All Other …")
    if (t === 'A' && /button/i.test(el.className) && !el.closest('p,li,h1,h2,h3,h4,h5,h6,blockquote,table,dl')) {
      const s = txt(el); if (s) blocks.push({ t: 'btn', href: el.getAttribute('href') || '', text: s }); seen.add(el); continue;
    }
    if (!HANDLED.test(t)) {
      if (INLINE.test(t) || el.closest('p,li,h1,h2,h3,h4,h5,h6,blockquote,table,dl,figcaption,button,label,select,option,svg')) continue;
      // >= 1, not > 1: the testimonial attribution is "- <span>Will K. - Yelp Review May 2018</span>", whose
      // only own text node is the single dash
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length >= 1)) continue;
      const s = ownInline(el);
      if (s.replace(/\[\[[^\]]*\]\]/g, '').trim().length >= 3) blocks.push({ t: 'p', html: s, loose: true });
      continue;
    }
    if (/^H[1-6]$/.test(t)) { const s = txt(el); if (s) blocks.push({ t: 'h', level: +t[1], text: s, html: inline(el) }); }
    else if (t === 'P') { const s = inline(el); if (txt(el)) blocks.push({ t: 'p', html: s }); }
    else if (t === 'UL' || t === 'OL') {
      if (el.parentElement.closest('ul,ol') && !seen.has(el)) { /* nested list: handled by parent */ }
      const items = [...el.children].filter((li) => li.tagName === 'LI').map((li) => inline(li)).filter(Boolean);
      if (items.length) blocks.push({ t: 'list', ordered: t === 'OL', items }); seen.add(el);
    }
    else if (t === 'IMG') {
      const src = el.currentSrc || el.src; if (!src || /^data:/.test(src)) continue;
      const r = el.getBoundingClientRect();
      blocks.push({ t: 'img', src, alt: el.getAttribute('alt') || '', w: el.naturalWidth, h: el.naturalHeight, shownW: Math.round(r.width) });
    }
    else if (t === 'BLOCKQUOTE') { blocks.push({ t: 'quote', text: txt(el) }); seen.add(el); }
    else if (t === 'TABLE') { blocks.push({ t: 'table', rows: [...el.rows].map((r) => [...r.cells].map((c) => txt(c))) }); seen.add(el); }
    else if (t === 'DL') { blocks.push({ t: 'p', html: inline(el) }); seen.add(el); }
    else if (t === 'IFRAME' || t === 'VIDEO') { const src = el.src || el.getAttribute('data-src') || ''; if (src) blocks.push({ t: 'embed', src, title: el.title || '' }); }
  }
  const forms = [...document.querySelectorAll('main form, article form')].map((f) => ({
    id: f.id,
    intro: [...f.querySelectorAll('.gform_title, .gform_description')].map((e) => txt(e)).filter(Boolean),
    sections: [...f.querySelectorAll('.gsection_title, .gsection_description, .gfield--type-html, .gfield_html')].map((e) => txt(e)).filter(Boolean),
    fields: [...f.querySelectorAll('input,select,textarea')].filter((i) => !/hidden|submit/.test(i.type)).map((i) => {
      const lab = (i.id && document.querySelector('label[for="' + i.id + '"]')) || i.closest('.gfield, li, .field, div')?.querySelector('label, legend');
      const gf = i.closest('.gfield'); const desc = gf && gf.querySelector('.gfield_description'); const glab = gf && gf.querySelector('.gfield_label, legend'); const sub = i.closest('.ginput_complex > span, .ginput_left, .ginput_right, span[class*=name_], span[class*=address_]'); const sublab = sub && sub.querySelector('label');
      const choiceLab = (i.type === 'radio' || i.type === 'checkbox') && i.id ? document.querySelector('label[for="' + i.id + '"]') : null;
      let section = ''; for (let s = gf && gf.previousElementSibling; s; s = s.previousElementSibling) { if (s.classList.contains('gsection')) { const st = s.querySelector('.gsection_title'); section = st ? txt(st) : ''; break; } }
      return { section, group: glab ? txt(glab).replace(/\*/g, '').trim() : '', sub: sublab ? txt(sublab) : '', desc: desc ? txt(desc) : '', choice: choiceLab ? txt(choiceLab) : '', tag: i.tagName.toLowerCase(), type: i.type || '', name: i.name || '', label: lab ? lab.innerText.replace(/\*/g, '').trim() : (i.placeholder || ''), required: i.required || /\*/.test(lab ? lab.innerText : ''), options: i.tagName === 'SELECT' ? [...i.options].map((o) => o.text) : undefined, value: i.type === 'radio' || i.type === 'checkbox' ? i.value : undefined };
    }),
  }));
  const og = document.querySelector('meta[property="og:image"]');
  return { title: document.title, description: (document.querySelector('meta[name=description]') || {}).content || '', canonical: (document.querySelector('link[rel=canonical]') || {}).href || '', ogImage: og ? og.content : '', blocks, forms };
})()`;

const only = process.argv[3] ? new RegExp(process.argv[3]) : null;
// optional sharding for parallel runs: SHARD=i/n (0-based) and PORT=<cdp port>
const [si, sn] = (process.env.SHARD || '0/1').split('/').map(Number);
const files = fs.readdirSync(REND).filter((f) => f.endsWith('.html') && (!only || only.test(f))).filter((_, i) => i % sn === si);
const b = await launch(+(process.env.PORT || 9336));
const pg = await newPage(b.port);
await pg.viewport(1440);
// block every network request: the saved DOM is evidence, never re-fetch the live site
await pg.send('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] });
// the saved DOM is already rendered: the old platform's scripts must not run again (they re-mutate the DOM
// and keep firing blocked requests, which held every page to the 15 s network-idle cap)
await pg.send('Emulation.setScriptExecutionDisabled', { value: true });
let n = 0;
for (const f of files) {
  const meta = JSON.parse(fs.readFileSync(path.join(REND, f.replace(/\.html$/, '.json')), 'utf8'));
  await pg.goto(pathToFileURL(path.join(REND, f)).href, { idle: 200, timeout: 15000 });
  const data = await pg.eval(EXTRACT);
  data.url = meta.url;
  fs.writeFileSync(path.join(OUT, f.replace(/\.html$/, '.json')), JSON.stringify(data, null, 1));
  n++;
}
console.log('extracted', n, 'pages ->', OUT);
pg.close(); b.close();
process.exit(0);
