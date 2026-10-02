// Audit resolutions with evidence. Re-runnable: node src/tools/resolve-audit.mjs
//  C05  the two high render-risk pages (contact-us, promotions) -> renderRisk.resolved with their headless-Chrome
//       render (audit/rendered/); the build reads audit/content-blocks/, extracted from that rendered DOM.
//  C24  recorded failures closed deliberately, each with its reason:
//       - crawl:page /sitemap 404: the source footer links a page the source never had (source defect);
//       - assets:data <page>/_blank 404 x33: not assets. sr-assets harvested the string literal "_blank" from the
//         platform's inline script ('"_blank"===n?window…', audit/raw/index.html) as a relative data URL and
//         resolved it against each page. No such file exists or was ever referenced as one.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const W = (f, d) => fs.writeFileSync(path.join(ROOT, f), JSON.stringify(d, null, 1));
const words = (s) => (String(s).match(/[A-Za-z0-9’'-]+/g) || []).length;

// C05
const c = J('audit/content-inventory.json');
const inv = J('audit/site-inventory.json');
const rr = c.renderRisk; rr.resolved = rr.resolved || [];
let n = 0;
for (const u of rr.high || []) {
  const pg = inv.pages.find((p) => p.url === u);
  const base = (pg.savedAs || '').replace(/\.html?$/, '');
  const rj = 'audit/rendered/' + base + '.json';
  if (!fs.existsSync(path.join(ROOT, rj))) throw new Error('no browser render for ' + u);
  const r = J(rj);
  const ci = c.pages.find((p) => p.url === u) || {};
  rr.resolved.push({ url: u, staticWords: ci.wordCount ?? null, renderedMainWords: words(r.text), evidence: rj + ' (headless Chrome render, ' + r.capturedAt + '); audit/content-blocks/' + base + '.json is extracted from that rendered DOM, so the build never used the static shell. The page is short on the source too: contact-us is address + phone, promotions is three offers.' });
  n++;
}
rr.high = [];
rr.note = (rr.note ? rr.note + ' ' : '') + 'High-risk pages resolved ' + new Date().toISOString().slice(0, 10) + ' by a full browser render of every crawled page (audit/rendered/, ' + inv.pages.length + ' pages); see resolved[].';
W('audit/content-inventory.json', c);

// C24
const f = J('audit/failures.json');
let a = 0;
for (const it of f.items) {
  if (it.accepted || it.resolved) continue;
  if (it.stage === 'crawl:page' && /\/sitemap$/.test(it.target) && /404/.test(it.reason)) {
    it.accepted = true; it.acceptedReason = 'Source defect: the footer "Sitemap" link points at a page the source never had (404). Not content; the rebuild ships sitemap.xml and 301s /sitemap to / (dist/_redirects).'; a++;
  } else if (it.stage === 'assets:data' && /\/_blank$/.test(it.target) && /404/.test(it.reason)) {
    it.accepted = true; it.acceptedReason = 'Parser artefact, not an asset: the string literal "_blank" in the platform inline script was read as a relative data URL. Nothing references a file named _blank.'; a++;
  }
}
W('audit/failures.json', f);
const open = f.items.filter((x) => !x.accepted && !x.resolved).length;
console.log('render-risk resolved', n, '· failures accepted', a, '· still open', open);
