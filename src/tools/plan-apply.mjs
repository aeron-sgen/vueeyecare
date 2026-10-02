// Change-control decisions with evidence, one per source section (audit/change-control.json from sr-plan).
// usage: node src/tools/plan-apply.mjs [--apply]        (dry run prints the tally and anything undecided)
//   heading row      IMPROVE when the section heading is present in the built page (normalised text match)
//   class-list row   (PatientEngage sections with no heading) the section is located in audit/raw/<page>.html by its
//                    own cpt--id; IMPROVE when >= RECALL of its words are in the built page
//   global header    (cpt--visible-xl section: Call button + Schedule button) REPLACE: rebuilt as the redesign's header
//   global footer    (Ihbdp7elz2: name, phone, address, Schedule button) IMPROVE, slot footer, same recall test
//   divider          (cpt--type-divider, no content) REMOVE
// Anything that fails its test is left UNSET and printed, never forced.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const APPLY = process.argv.includes('--apply');
const { tokenRecall } = await import(pathToFileURL(path.join(process.env.USERPROFILE, '.claude/skills/site-reforge/scripts/lib/util.mjs')).href);
const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const ledger = J('audit/change-control.json'); const rmap = J('audit/route-map.json'); const br = J('audit/build-report.json');
const inv = J('audit/site-inventory.json');
const RECALL = 0.95;
const removed = new Map(br.removed.map((r) => [r.url, r]));
const ent = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;|&lsquo;|&#x27;/g, '’').replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&[a-z]+;|&#\d+;/g, ' ');
const strip = (h) => ent(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
const norm = (s) => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'&]+/g, ' ').trim();
const builtText = new Map();
const built = (file) => { if (!builtText.has(file)) builtText.set(file, strip(fs.readFileSync(path.join(ROOT, 'dist', file), 'utf8'))); return builtText.get(file); };
const rawOf = new Map(inv.pages.map((p) => [p.url, p.savedAs]));
// the text of one source section, located by its cpt--id: from its opening tag to the matching </section>
function sectionText(url, cls) {
  const id = (cls.match(/cpt--id-[A-Za-z0-9]+/) || [])[0];
  if (!id) return null;
  const html = fs.readFileSync(path.join(ROOT, 'audit/raw', rawOf.get(url)), 'utf8');
  const at = html.search(new RegExp('<(section|div)[^>]*class="[^"]*\\b' + id + '\\b'));
  if (at < 0) return null;
  const tag = html.slice(at + 1, html.indexOf(' ', at)).trim();
  const re = new RegExp('<(/?)' + tag + '\\b', 'g'); re.lastIndex = at + 1; let depth = 1, m, end = html.length;
  while ((m = re.exec(html))) { depth += m[1] ? -1 : 1; if (depth === 0) { end = m.index; break; } }
  return strip(html.slice(at, end));
}
const slotFor = (r) => {
  const u = r.url.replace(/^https?:\/\/[^/]+/, ''); const L = r.label.toLowerCase();
  if (/privacy|disclaimer|accessibility/.test(u)) return 'footer';
  if (/hours|location|directions|contact us/.test(L) || /\/contact-us\/?$|location|hours/.test(u)) return 'footer';
  if (/review|testimonial/.test(L + u)) return 'social-proof';
  if (/appointment|schedule|book|request|promotion/.test(L + u)) return 'strategic-cta';
  if (/insurance|faq|carecredit|payment|financ|emergency/.test(L + u)) return 'objection-handling';
  if (u === '/' && r.index <= 1) return 'value-proposition';
  if (/doctor|dr\.|dinh|optometrist|about|clinic|technology/.test(L + u)) return 'trust-positioning';
  return 'benefits-solution';
};
const miss = []; const tally = {};
for (const r of ledger.rows) {
  const set = (decision, why, slot = '', file = '') => { Object.assign(r, { decision, why, narrativeSlot: slot, rebuiltAs: file }); const k = decision + ':' + (slot || '-'); tally[k] = (tally[k] || 0) + 1; };
  if (r.id.startsWith('add:')) continue;   // ADD rows are (re)written below from the parity extras
  const rm = removed.get(r.url);
  if (rm) { set('REMOVE', rm.why + ' — 301 to ' + (rm.to === '/' ? '/' : rm.to + '/')); continue; }
  const file = rmap[r.url];
  if (!file) { miss.push(['NO-FILE', r.id, r.label]); continue; }
  const isClassLabel = /^cpt\b/.test(r.label);
  if (!isClassLabel) {
    const lab = norm(r.label.replace(/\s*»\s*$/, ''));
    if (norm(built(file)).includes(lab)) set('IMPROVE', 'Same source copy, restructured into the Iris Editorial redesign (design C); section heading verified present in dist/' + file, slotFor(r), file);
    else miss.push([file, r.id, r.label]);
    continue;
  }
  if (/cpt--type-divider/.test(r.label)) { set('REMOVE', 'Decorative divider: no text, no media; the redesign separates sections with hairline rules and section grounds'); continue; }
  if (/cpt--visible-xl/.test(r.label)) { set('REPLACE', 'Global header strip ("Call" + "Schedule Appointment" buttons): rebuilt as the redesign header and mobile bar with the same two actions. The Call label is corrected from the source\'s "(303) 979-4505" to (225) 752-2419, the number its own tel: link dials (facts/client-facts.json sourceDefects)', 'strategic-cta', file); continue; }
  const txt = sectionText(r.url, r.label);
  if (!txt || !txt.trim()) { miss.push([file, r.id, 'section not located: ' + r.label.slice(0, 40)]); continue; }
  const rec = tokenRecall(txt, built(file));
  if (rec.srcCount === 0) { set('REMOVE', 'Section carries no text (media/layout only); its imagery, if any, is listed in audit/build-report.json'); continue; }
  // a collapsed list's own toggle ("Show More"/"Show Less") is UI, not copy: the rebuild shows the list expanded
  const UI = /^(show|more|less)$/;
  if (rec.recall < RECALL && rec.missing.length && rec.missing.every((w) => UI.test(w))) {
    set('IMPROVE', 'Collapsed list rebuilt expanded in dist/' + file + ': every word carried except the source\'s "Show More/Less" toggle label (' + (rec.recall * 100).toFixed(1) + '% of ' + rec.srcCount + ' words; section located by ' + (r.label.match(/cpt--id-[A-Za-z0-9]+/) || [''])[0] + ')', slotFor(r), file);
    continue;
  }
  if (rec.recall < RECALL) { miss.push([file, r.id, 'recall ' + rec.recall.toFixed(3) + ' missing: ' + rec.missing.slice(0, 12).join(' ')]); continue; }
  const footer = /Ihbdp7elz2/.test(r.label);
  set('IMPROVE', (footer ? 'Global footer block' : 'Section') + ' copy carried into dist/' + file + ' at ' + (rec.recall * 100).toFixed(1) + '% token recall of its ' + rec.srcCount + ' words (section located in audit/raw by ' + (r.label.match(/cpt--id-[A-Za-z0-9]+/) || [''])[0] + ')', footer ? 'footer' : slotFor(r), file);
}
// ADD rows: pages the build has that the source did not (C16 counts build extras against ADD decisions)
const ADDS = {
  'reviews/index.html': ['Patient Reviews page', 'Eye Trends has a /reviews page; the source keeps its 20 reviews only in the home widget. All 20 shown in full from the source JSON-LD (facts/client-facts.json), heading "Patient Reviews" is the source widget heading', 'social-proof'],
  'products/index.html': ['Eyewear hub', 'Eye Trends\' primary nav item "Eyewear" is a /products hub; Vue has no eyewear index page. This one lists only Vue\'s own eyewear pages, each with its source H1 and source meta description (no new copy)', 'benefits-solution'],
  'search/index.html': ['Site search', 'Static site search over search-index.json (built from the source copy); the Eye Trends structure has search in the footer', 'footer'],
  '404.html': ['Not-found page', 'Static host error page; links back to services, eyewear and home', 'footer'],
};
const extras = J('audit/parity-report.json').extraFiles || [];
for (const f of extras) {
  const a = ADDS[f]; if (!a) { miss.push([f, 'ADD', 'build page with no ADD reason in plan-apply.mjs']); continue; }
  const id = 'add:' + f;
  let row = ledger.rows.find((r) => r.id === id);
  if (!row) { row = { id, url: '', pageType: 'added', index: 0, label: a[0], sourceTag: '', sourceClass: '', presetId: '' }; ledger.rows.push(row); }
  Object.assign(row, { decision: 'ADD', why: a[1], narrativeSlot: a[2], rebuiltAs: f });
  tally['ADD:' + a[2]] = (tally['ADD:' + a[2]] || 0) + 1;
}
ledger.rowCount = ledger.rows.length;
console.log(tally); console.log('undecided', miss.length); for (const m of miss) console.log('  ', m.join(' | '));
if (APPLY) { ledger.updated = new Date().toISOString(); fs.writeFileSync(path.join(ROOT, 'audit/change-control.json'), JSON.stringify(ledger, null, 2)); console.log('written'); }
