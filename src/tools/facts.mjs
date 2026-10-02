// Writes facts/client-facts.json from the captured Vue Eyecare site only (audit/rendered + audit/content-blocks).
// Every value is read from the evidence here or copied verbatim from it (named in _sources); nothing comes
// from Eye Trends, which supplies page structure only. Re-runnable: node src/tools/facts.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const homeHtml = fs.readFileSync(path.join(ROOT, 'audit/rendered/index.html'), 'utf8');
const homeText = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/rendered/index.json'), 'utf8')).bodyText.replace(/\s+/g, ' ');
const hoursText = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/rendered/hours-location.json'), 'utf8')).bodyText.replace(/\s+/g, ' ');
const must = (hay, s, where) => { if (!hay.includes(s)) throw new Error('facts: "' + s + '" not found in ' + where); return s; };

// JSON-LD LocalBusiness graph on the home page: address, NAP phone, aggregate rating and the 20 reviews
const lds = [...homeHtml.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const biz = lds.flatMap((l) => l['@graph'] || [l]).find((x) => x['@type'] === 'LocalBusiness');
if (!biz) throw new Error('facts: no LocalBusiness JSON-LD on the home page');

// hours, parsed from the rendered hours-location page ("Monday: 8:00 am - 4:30 pm ... Sunday: Closed")
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const hoursStructured = DAYS.map((day) => {
  const m = hoursText.match(new RegExp(day + ':\\s*(Closed|\\d{1,2}:\\d{2} [ap]m - \\d{1,2}:\\d{2} [ap]m)', 'i'));
  if (!m) throw new Error('facts: no hours for ' + day);
  return { day, slots: /closed/i.test(m[1]) ? [] : [m[1].replace(/\b([ap])m\b/g, (x, a) => a.toUpperCase() + 'M')] };
});

const link = (re, what) => { const m = homeHtml.match(re); if (!m) throw new Error('facts: link not found: ' + what); return m[1].replace(/&amp;/g, '&'); };

const facts = {
  schema: 'site-reforge/client-facts@1',
  note: 'Declared facts. Every value is copied from the captured Vue Eyecare site (audit/rendered, audit/content-blocks); the source is named per field in _sources. Nothing here comes from Eye Trends, which supplied only page structure.',
  legalName: biz.name,
  brand: biz.name,
  phone: [must(homeText, '(225) 752-2419', 'home footer')],
  fax: null,
  email: [],
  addresses: [{
    street: biz.address.streetAddress, city: biz.address.addressLocality, region: 'LA', regionName: biz.address.addressRegion,
    postal: biz.address.postalCode, country: biz.address.addressCountry,
    line: must(homeText, "2515 O'Neal Ln Suite #5, Baton Rouge, LA 70816", 'home footer'),
  }],
  areasServed: ['Baton Rouge', 'Denham Springs'],
  hours: hoursStructured.map((d) => d.day + ': ' + (d.slots[0] || 'Closed')).join('; '),
  hoursStructured,
  people: [{
    name: 'Dr. Phuong T. Dinh', short: 'Dr. P.T. Dinh', credentials: must(homeText, 'P.T. Dinh, OD, MS, IACMM', 'home doctor card'), role: 'Optometrist',
    education: 'Bachelor of Science, Louisiana State University; Master of Science and Doctor of Optometry, University of Houston (2005)',
    certifications: ['Advanced certification from the International Academy in Myopia Management'],
  }],
  founded: null, licences: [], awards: [], statistics: [],
  aggregateRating: { ratingValue: biz.aggregateRating.ratingValue, reviewCount: biz.aggregateRating.reviewCount },
  testimonials: biz.review.map((r) => ({ author: r.author.name, text: r.reviewBody, rating: r.reviewRating.ratingValue, source: 'home page JSON-LD LocalBusiness.review (rendered as the "Patient Reviews" widget)' })),
  promotions: [
    { title: 'Summer is a Big Deal!', text: '50% OFF All Non-Prescription Sunglasses frames!' },
    { title: 'Need a Spare?!', text: 'One Complete pair of Single Vision eyeglasses starting at $79' },
    { title: 'Great Value Package!', text: 'One Complete pair of Single Vision eyeglasses with BLUE LIGHT FILTER starting at $119.99' },
  ],
  links: {
    book: link(/href="(https:\/\/p\.adit\.com\/[^"]+)"[^>]*aria-label="Schedule Appointment/, 'Schedule Appointment'),
    reviewsGoogle: link(/<a class="button" href="([^"]+)"[^>]*aria-label="Read More Reviews/, 'Read More Reviews'),
    facebook: link(/href="(https:\/\/www\.facebook\.com\/[^"]+)"/, 'Facebook'),
    directions: link(/class="location-summary__item" href="(https:\/\/www\.google\.com\/maps\/[^"]+)"/, 'map link'),
  },
  clients: [], guarantees: [], pricing: [], services: [],
  sourceDefects: [
    { where: 'header Call button, every page', what: 'label reads "Call (303) 979-4505" but the link dials tel:+12257522419; the rebuild shows (225) 752-2419, the number the button actually calls and the NAP phone everywhere else. Operator decision 2026-10-01: keep (225) 752-2419', decided: 'keep (225) 752-2419' },
    { where: 'home "Quality Eye Care & Treatment"', what: 'the "Myopia Control »" card carries the eye-emergency paragraph; kept verbatim' },
    { where: 'footer "Sitemap" link', what: '/sitemap returns 404' },
  ],
  _sources: {
    address: 'JSON-LD LocalBusiness on the home page; footer of every page',
    phone: '(225) 752-2419: footer of every page, JSON-LD (225-752-2419), every tel: link',
    hours: 'hours-location (rendered)',
    people: 'team/pt-dinh-od-ms-iacmm and our-eye-doctors',
    areasServed: 'doctor bio: "individuals and families throughout Baton Rouge, Denham Springs, and the surrounding communities"',
    testimonials: 'home page JSON-LD review[] (full text; the visible widget truncates long reviews behind "Show More")',
    promotions: 'promotions (rendered)',
    links: 'home page (rendered): Schedule Appointment (Adit), Read More Reviews (Google), Facebook icon, map link in the location summary',
  },
};
for (const p of facts.promotions) { const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/rendered/promotions.json'), 'utf8')).bodyText.replace(/\s+/g, ' '); must(t, p.title, 'promotions'); must(t, p.text, 'promotions'); }
fs.mkdirSync(path.join(ROOT, 'facts'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'facts/client-facts.json'), JSON.stringify(facts, null, 2));
console.log('facts: ' + facts.testimonials.length + ' reviews, hours ' + facts.hours + ', book ' + facts.links.book);
