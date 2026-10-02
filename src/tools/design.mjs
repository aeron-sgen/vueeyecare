// DESIGN C — "Iris Editorial".
// Warm paper and sand grounds, Vue's navy as ink, azure links, gold accents. Fraunces (display serif, optical size)
// over Instrument Sans. Photography sits in plain rounded frames; the recurring motif is the iris: thin concentric rings
// (CSS, decorative). Full-bleed navy blocks carry the doctor, the reviews and the footer.
// Owns every piece of chrome and page template; build.mjs owns content. No generated imagery.

import fs from 'node:fs';
import crypto from 'node:crypto';

export const NAME = 'design-c-modern';
// generated-art group (none exist in this project; kept so build.mjs's shared loader is unchanged)
export const ART_GROUP = 'c';

// Cache-busting stamp: a short content hash on each shipped stylesheet/script URL.
const stamp = (rel) => '?v=' + crypto.createHash('sha256').update(fs.readFileSync(new URL('../' + rel, import.meta.url))).digest('hex').slice(0, 8);
const V = { tokens: stamp('styles/tokens.css'), site: stamp('styles/site.css'), js: stamp('scripts/site.js') };

const sv = (d, w = 1.6) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
export const ICON = {
  phone: sv('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
  pin: sv('<path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  clock: sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  iris: sv('<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2"/>'),
  calendar: sv('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/></svg>',
  quote: '<svg viewBox="0 0 48 40" fill="currentColor" aria-hidden="true"><path d="M0 40V24C0 10 7 2 20 0l2 6C14 8 11 13 11 19h9v21zm26 0V24c0-14 7-22 20-24l2 6c-8 2-11 7-11 13h9v21z"/></svg>',
  menu: sv('<path d="M4 8h16M4 16h16"/>', 1.8),
  close: sv('<path d="M6 6l12 12M18 6L6 18"/>', 1.8),
  chev: sv('<path d="M6 9l6 6 6-6"/>', 1.8),
  arrowL: sv('<path d="M19 12H5M11 6l-6 6 6 6"/>', 1.6),
  arrowR: sv('<path d="M5 12h14M13 6l6 6-6 6"/>', 1.6),
  arrow: sv('<path d="M5 12h14M13 6l6 6-6 6"/>', 1.6),
  search: sv('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 1.8),
  tag: sv('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>'),
  shield: sv('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
  lens: sv('<ellipse cx="12" cy="13" rx="9" ry="6.5"/><path d="M4.5 10.5c2.4 1.6 12.6 1.6 15 0"/>'),
  glasses: sv('<circle cx="6.5" cy="14" r="3.5"/><circle cx="17.5" cy="14" r="3.5"/><path d="M10 14h4M3 14l1.5-6H7M21 14l-1.5-6H17"/>'),
};

const FONTS = ['intertight-latin-var.woff2', 'instrument-latin-var.woff2'];

// The iris motif: concentric rings, purely decorative.
export const irisRings = (cls = '') => '<span class="iris ' + cls + '" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';

const brandMark = (k, size = 44) => '<span class="brand-mark" style="--s:' + size + 'px"><img src="' + k.ART.logo.src + '" alt="" width="' + size + '" height="' + size + '"></span>';

function header(current, k) {
  const { esc, NAV, ART, BOOK, EXT, PHONE_CALL, tel, A, facts, hoursRows } = k;
  const cur = (href) => (current === href || (href !== '/' && current.startsWith(href + '/')) ? ' aria-current="page"' : '');
  const open = hoursRows().filter((r) => r.slots.length).map((r) => (r.from === r.to ? r.from.day.slice(0, 3) : r.from.day.slice(0, 3) + '–' + r.to.day.slice(0, 3)) + ' ' + r.slots.join(', ')).join(' · ');
  // Services mega: Eye Trends' five columns; each column head is a link (to the group's first page) and the
  // column lists the group's other pages. A group with one page keeps it listed under its head.
  const groups = NAV.services.map(([h, links]) => { const head = links[0][0]; const rest = links.filter(([href]) => href !== head); return { h, head, kids: rest.length ? rest : links.filter(([, t]) => t !== h) }; });
  const svcCols = groups.map((g) => '<div class="mcol"><a class="mcol-head" href="' + g.head + '/">' + esc(g.h) + '</a><ul>' + g.kids.map(([href, t]) => '<li><a href="' + href + '/">' + esc(t) + '</a></li>').join('') + '</ul></div>').join('');
  const EY_ICON = { frames: ICON.glasses, contacts: ICON.lens, 'contact-finger': ICON.lens, 'man-glasses': ICON.tag };
  const eyeCards = NAV.eyewear.map(([href, t, art]) => '<a class="ecard" href="' + href + '/"><span class="ecard-ico">' + (EY_ICON[art] || ICON.glasses) + '</span><b>' + esc(t) + '</b>' + (k.metaOf(href) ? '<small>' + esc(k.metaOf(href)) + '</small>' : '') + '</a>').join('');
  const promoPanel = (p) => '<aside class="mega-promo"><p class="kicker">' + esc(p.eyebrow) + '</p><p class="mega-promo-h">' + esc(p.h) + '</p>' + (p.p ? '<p>' + esc(p.p) + '</p>' : '') + '<a class="btn btn-gold" href="' + BOOK + '"' + EXT + '>' + ICON.calendar + ' Schedule Appointment</a></aside>';
  const dlist = (arr) => arr.map(([h, t]) => '<li><a href="' + h + '/">' + esc(t) + '</a></li>').join('');
  const drillHead = (title) => '<div class="dv-head"><button type="button" class="dv-back" data-back>' + ICON.arrowL + '<span>Back</span></button><p class="dv-title">' + esc(title) + '</p></div>';
  const drillBook = '<li><a class="dv-book" href="' + BOOK + '"' + EXT + '>' + ICON.calendar + ' Schedule Appointment</a></li>';
  return `<a class="skip" href="#main">Skip to main content</a>
<div class="utility"><div class="wrap"><a href="/eye-doctor-baton-rouge/">${ICON.pin}<span>${esc(A.line)}</span></a><a class="u-hours" href="/eye-doctor-baton-rouge/hours/">${ICON.clock}<span>${esc(open)}</span></a><a href="${tel(PHONE_CALL)}">${ICON.phone}<span>${esc(PHONE_CALL)}</span></a></div></div>
<header class="site-header"><div class="wrap bar">
<a class="brand" href="/" aria-label="${esc(facts.brand)} home">${brandMark(k)}<span class="brand-name">${esc(facts.brand)}</span></a>
<nav class="nav" aria-label="Primary"><ul>
<li><a href="/"${current === '/' ? ' aria-current="page"' : ''}>Home</a></li>
<li><a href="/our-doctor/"${cur('/our-doctor')}>About Us</a></li>
<li class="has-mega"><button type="button" aria-expanded="false" aria-controls="mega-services">Services ${ICON.chev}</button><div class="mega mega-wide" id="mega-services">${promoPanel(k.PROMO.services)}<div class="mega-main"><div class="mega-cols">${svcCols}</div><p class="mega-foot"><a href="/services/">All eye care services ${ICON.arrow}</a></p></div></div></li>
<li class="has-mega"><button type="button" aria-expanded="false" aria-controls="mega-eyewear">Eyewear ${ICON.chev}</button><div class="mega mega-wide" id="mega-eyewear">${promoPanel(k.PROMO.eyewear)}<div class="mega-main"><div class="mega-ecards">${eyeCards}</div><p class="mega-foot"><a href="/products/">All eyewear ${ICON.arrow}</a></p></div></div></li>
<li><a href="/insurance/"${cur('/insurance')}>Insurance</a></li>
<li><a href="/reviews/"${cur('/reviews')}>Reviews</a></li>
<li><a href="/eye-doctor-baton-rouge/"${cur('/eye-doctor-baton-rouge')}>Visit Us</a></li>
</ul></nav>
<div class="header-cta"><a class="btn btn-ink" href="${BOOK}"${EXT}>${ICON.calendar}<span>Schedule Appointment</span></a>
<button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="drawer">${ICON.menu}</button></div>
</div></header>
<div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Menu"><div class="drawer-scrim" data-close></div><div class="drawer-panel">
<div class="drawer-head"><a class="brand" href="/">${brandMark(k, 40)}<span class="brand-name">${esc(facts.brand)}</span></a><button class="menu-close" type="button" aria-label="Close menu" data-close>${ICON.close}</button></div>
<div class="dv" data-view="root">
<a class="d-link" href="/">Home</a>
<a class="d-link" href="/our-doctor/">About Us</a>
<button type="button" class="d-link d-drill" data-drill="services" aria-controls="dv-services">Services ${ICON.arrowR}</button>
<button type="button" class="d-link d-drill" data-drill="eyewear" aria-controls="dv-eyewear">Eyewear ${ICON.arrowR}</button>
<a class="d-link" href="/insurance/">Insurance</a><a class="d-link" href="/reviews/">Reviews</a><a class="d-link" href="/eye-doctor-baton-rouge/">Visit Us</a>
<div class="drawer-cta"><a class="btn btn-ink" href="${BOOK}"${EXT}>Schedule Appointment</a><a class="btn btn-line" href="${tel(PHONE_CALL)}">${ICON.phone} Call ${esc(PHONE_CALL)}</a></div>
</div>
<div class="dv" data-view="services" id="dv-services" hidden>${drillHead('Services')}<ul class="dv-list">${drillBook}<li><a href="/services/">All eye care services</a></li>${groups.map((g) => '<li class="dv-group"><a href="' + g.head + '/">' + esc(g.h) + '</a></li>' + (g.kids.some(([href]) => href === g.head) ? '' : dlist(g.kids))).join('')}</ul></div>
<div class="dv" data-view="eyewear" id="dv-eyewear" hidden>${drillHead('Eyewear')}<ul class="dv-list">${drillBook}<li><a href="/products/">All eyewear</a></li>${NAV.eyewear.map(([h, t]) => '<li><a href="' + h + '/">' + esc(t) + '</a></li>').join('')}</ul></div>
</div></div>`;
}

// Footer, Eye Trends' order: brand row (mark + the doctor credit line) over four columns
// (Eye Care Services · Eyewear · Practice · Visit), then search and the legal row. The booking band with the
// map sits directly above it (ctaBand). Every value comes from facts/client-facts.json.
function footer(k) {
  const { esc, NAV, BOOK, EXT, PHONE_NAP, tel, A, hoursTable, facts } = k;
  const doc = facts.people[0];
  return `<footer class="site-footer"><div class="wrap">
<div class="foot-top">
<a class="brand" href="/">${brandMark(k, 52)}<span class="brand-name">${esc(facts.brand)}</span></a>
<p class="foot-credit"><b>${esc(doc.credentials)}</b>, ${esc(doc.role)} · ${esc(A.city)}, ${esc(A.regionName)}</p>
<p class="foot-social"><a href="${facts.links.facebook}"${EXT}>Facebook</a><a href="${facts.links.reviewsGoogle}"${EXT}>Read More Reviews</a></p>
</div>
<div class="foot-cols">
<div><h2>Eye Care Services</h2><ul>${NAV.services.map(([h, l]) => '<li><a href="' + l[0][0] + '/">' + esc(h) + '</a></li>').join('')}<li><a href="/services/">All services</a></li></ul></div>
<div><h2>Eyewear</h2><ul>${NAV.eyewear.map(([h, t]) => '<li><a href="' + h + '/">' + esc(t) + '</a></li>').join('')}<li><a href="/products/">All eyewear</a></li></ul></div>
<div><h2>Practice</h2><ul><li><a href="/our-doctor/">Our Eye Doctor</a></li><li><a href="/insurance/">Insurance</a></li><li><a href="/insurance/carecredit/">CareCredit</a></li><li><a href="/reviews/">Patient Reviews</a></li><li><a href="/contact/">Contact Us</a></li></ul></div>
<div class="fcol-visit"><h2>Visit</h2>
<p class="foot-addr"><a href="/eye-doctor-baton-rouge/">${esc(A.street)}<br>${esc(A.city)}, ${esc(A.region)} ${esc(A.postal)}</a></p>
<p><a class="foot-phone" href="${tel(PHONE_NAP)}">${esc(PHONE_NAP)}</a></p>
${hoursTable('hours hours-foot')}
<ul><li><a href="/eye-doctor-baton-rouge/hours/">Hours &amp; Location</a></li><li><a href="${BOOK}"${EXT}>Schedule an Appointment</a></li><li><a href="${facts.links.directions}"${EXT}>Directions</a></li></ul></div>
</div>
<div class="foot-search"><form class="site-search" role="search" action="/search/" method="get"><label for="footer-q">Search the site</label><div class="search-field">${ICON.search}<input id="footer-q" name="q" type="search" placeholder="Dry eye, contacts, insurance…" autocomplete="off"><button class="btn btn-gold" type="submit">Search</button></div></form></div>
<div class="foot-bottom"><span>© 2026 ${esc(facts.brand)}</span><ul><li><a href="/accessibility/">Accessibility</a></li><li><a href="/privacy-policy/">Privacy</a></li><li><a href="/disclaimer/">Disclaimer</a></li></ul></div>
</div></footer>
<div class="mobile-bar"><a class="btn btn-line" href="${tel(k.PHONE_CALL)}">${ICON.phone} Call</a><a class="btn btn-ink" href="${BOOK}"${EXT}>Schedule Appointment</a></div>`;
}

export function layout({ title, description, canonical, body, current, ogImage, jsonld = [] }, k) {
  const { esc, SITE, ART, JS_FLAG } = k;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${description ? '<meta name="description" content="' + esc(description) + '">' : ''}
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
${description ? '<meta property="og:description" content="' + esc(description) + '">' : ''}
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(SITE + (ogImage || ART.hero.src))}">
<meta name="theme-color" content="#ffffff">
<meta name="color-scheme" content="light">
<link rel="icon" href="${ART.logo.src}">
${FONTS.map((f) => '<link rel="preload" href="/assets/fonts/' + f + '" as="font" type="font/woff2" crossorigin>').join('\n')}
<link rel="stylesheet" href="/styles/tokens.css${V.tokens}">
<link rel="stylesheet" href="/styles/site.css${V.site}">
${jsonld.map((j) => '<script type="application/ld+json">' + JSON.stringify(j) + '</script>').join('\n')}
<script>${JS_FLAG}</script>
</head>
<body>
${header(current, k)}
<main id="main">
${body}
</main>
${footer(k)}
<script src="/scripts/site.js${V.js}" defer></script>
</body>
</html>
`;
}

// The booking band above the footer, Eye Trends' split layout: label, heading, address and hours line, booking
// and call actions, and the map beside it. Every line is the source's own (its booking label, its NAP, its hours).
export function ctaBand(k, h = 'Schedule an Appointment') {
  const { esc, BOOK, EXT, PHONE_CALL, tel, A, hoursRows, facts } = k;
  const hours = hoursRows().map((r) => (r.from === r.to ? r.from.day.slice(0, 3) : r.from.day.slice(0, 3) + '–' + r.to.day.slice(0, 3)) + ' ' + (r.slots.length ? r.slots.join(', ') : 'Closed')).join(' · ');
  return `<section class="cta-band" aria-labelledby="cta-h"><div class="wrap cta-inner">
<div class="cta-copy reveal"><p class="kicker">${ICON.iris}<span>${esc(facts.brand)} · ${esc(A.city)}, ${esc(A.region)}</span></p><h2 id="cta-h">${esc(h)}</h2>
<p class="cta-note">${esc(A.line)}<br>${esc(hours)}</p>
<div class="actions"><a class="btn btn-ink btn-lg" href="${BOOK}"${EXT}>${ICON.calendar} Schedule Appointment</a><a class="btn btn-line btn-lg" href="${tel(PHONE_CALL)}">${ICON.phone} Call ${esc(PHONE_CALL)}</a></div></div>
<div class="cta-map reveal"><iframe src="https://maps.google.com/maps?q=${encodeURIComponent(facts.brand + ', ' + A.line)}&amp;output=embed" title="Map to ${esc(facts.brand)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
</div></section>`;
}

export function formHandoff({ name, href }, k) {
  const { esc, PHONE_NAP, tel } = k;
  return '<div class="form-handoff"><h2>' + esc(name) + '</h2><p class="form-handoff-actions"><a class="btn btn-ink" href="' + esc(href) + '" target="_blank" rel="noopener">Open the ' + esc(name) + '</a></p><p class="hint">Prefer to talk? Call <a href="' + tel(PHONE_NAP) + '">' + esc(PHONE_NAP) + '</a>.</p></div>';
}

const heroFigure = (heroImg, esc, sizes) => {
  if (!heroImg) return '';
  const portrait = heroImg.h && heroImg.w && heroImg.h > heroImg.w * 1.05;
  return '<figure class="ph-media' + (heroImg.contain ? ' contain' : '') + (portrait ? ' portrait' : '') + '">'
    + '<span class="photo"><img src="' + heroImg.src + '" alt="' + esc(heroImg.alt) + '" width="' + (heroImg.w || 1600) + '" height="' + (heroImg.h || 1200) + '" fetchpriority="high" decoding="async" sizes="' + sizes + '"></span></figure>';
};

// the related band links to its hub with the navigation's own wording for that hub
const HUB_LINK = { '/services/': 'All eye care services', '/insurance/': 'Insurance', '/our-doctor/': 'Our Eye Doctor', '/products/': 'All eyewear', '/products/contact-lenses/': 'Contact Lenses', '/eye-doctor-baton-rouge/': 'Visit Us' };
const pageKicker = (label, esc) => (label ? '<p class="kicker">' + ICON.iris + '<span>' + esc(label) + '</span></p>' : '');

// Interior page, Eye Trends' band layout: a hero (label, H1, lead, actions, photo), then the page's own copy as
// full-width bands, one per source H2 (the copy before the first H2 opens the page), a related-pages band, and
// the booking band. No sidebar and no breadcrumbs, as on Eye Trends. Legal pages stay one continuous band.
export function interior({ page, title, lead, heroImg, eyebrow, prose, splitBands = true, related }, k) {
  const { esc, BOOK, EXT, PHONE_CALL, tel } = k;
  // lists of short items (4 or more, at most 6 words each) are marked so they can flow in two columns
  prose = prose.replace(/<ul>((?:<li>[\s\S]*?<\/li>)+)<\/ul>/g, (m, inner) => {
    const items = inner.match(/<li>[\s\S]*?<\/li>/g) || [];
    const short = items.length >= 4 && items.every((li) => li.replace(/<[^>]+>/g, '').trim().split(/\s+/).length <= 6);
    return short ? '<ul class="short-list">' + inner + '</ul>' : m;
  });
  const chunks = splitBands ? prose.split(/(?=<h2[\s>])/) : [prose];
  let n = 0;
  const bands = chunks.map((c) => c.trim()).filter(Boolean).map((c) => {
    const m = c.match(/^<h2[^>]*>[\s\S]*?<\/h2>/);
    const alt = n++ % 2 ? ' alt' : '';
    if (!m) return '<section class="band band-open' + alt + '"><div class="wrap band-grid solo"><div class="band-body prose">' + c + '</div></div></section>';
    const body = c.slice(m[0].length).trim();
    return '<section class="band' + alt + '"><div class="wrap band-grid' + (body ? '' : ' solo') + '"><div class="band-head">' + m[0] + '</div>' + (body ? '<div class="band-body prose">' + body + '</div>' : '') + '</div></section>';
  }).join('\n');
  const rel = related.links.length ? `<section class="band related" aria-labelledby="rel-h"><div class="wrap">
<div class="rel-head"><h2 id="rel-h">${esc(related.heading)}</h2>${related.hub ? '<a class="link-arrow" href="' + related.hub + '">' + esc(HUB_LINK[related.hub] || related.heading) + ' ' + ICON.arrow + '</a>' : ''}</div>
<ul class="rel-grid">${related.links.map(([h, t, d]) => '<li><a href="' + h + '"><b>' + esc(t) + '</b>' + (d ? '<span>' + esc(d) + '</span>' : '') + '<i aria-hidden="true">' + ICON.arrow + '</i></a></li>').join('')}</ul>
</div></section>` : '';
  return `
<section class="page-hero${heroImg ? '' : ' no-media'}"><div class="wrap ph-grid">
<div class="ph-text">${pageKicker(eyebrow, esc)}<h1>${esc(title)}</h1>${lead ? '<p class="lead">' + lead + '</p>' : ''}
<div class="hero-actions"><a class="btn btn-ink" href="${BOOK}"${EXT}>${ICON.calendar} Schedule Appointment</a><a class="btn btn-line" href="${tel(PHONE_CALL)}">${ICON.phone} ${esc(PHONE_CALL)}</a></div></div>
${heroFigure(heroImg, esc, '(max-width: 900px) calc(100vw - 32px), 460px')}
</div></section>
${bands}
${rel}
${ctaBand(k)}`;
}

// One review as a card: stars (the source's 5-star rating), the full review text, the author.
// clamp: visual line clamp for the carousel only (the words stay in the DOM).
export function reviewCard(r, k, { clamp = true } = {}) {
  const { esc } = k;
  const stars = r.rating ? '<p class="rc-rating"><span class="stars" aria-hidden="true">' + ICON.star.repeat(Math.round(+r.rating)) + '</span><span class="sr-only">Rated ' + esc(r.rating) + ' out of 5</span></p>' : '';
  return '<li class="review-card' + (clamp ? ' clamp' : '') + '"><figure><span class="rc-quote">' + ICON.quote + '</span>' + stars
    + '<blockquote>' + r.text.map((t) => '<p>' + t + '</p>').join('') + '</blockquote>'
    + '<figcaption>' + esc(r.author) + '</figcaption>'
    + '</figure></li>';
}

export function reviewsPage({ heading, agg, cards, more }, k) {
  const { esc, EXT } = k;
  return `<section class="page-hero no-media"><div class="wrap ph-grid"><div class="ph-text">
${pageKicker('Reviews', esc)}
<h1>${esc(heading)}</h1>
<p class="agg"><span class="stars" aria-hidden="true">${ICON.star.repeat(5)}</span><span><b>${esc(agg.ratingValue)}</b> out of 5 · ${esc(agg.reviewCount)} reviews</span></p>
<div class="hero-actions"><a class="btn btn-line" href="${esc(more)}"${EXT}>Read More Reviews ${ICON.arrow}</a></div>
</div></div></section>
<section class="section tight"><div class="wrap"><ul class="review-grid">${cards}</ul></div></section>
${ctaBand(k)}`;
}

// Hub page (the Eye Trends /products "Eyewear" index): one card per child page, each carrying that page's own
// source H1 and meta description.
export function hubPage({ heading, cards }, k) {
  const { esc } = k;
  return `<section class="page-hero no-media"><div class="wrap ph-grid"><div class="ph-text">
${pageKicker(k.facts.brand, esc)}
<h1>${esc(heading)}</h1>
</div></div></section>
<section class="section tight"><div class="wrap"><ul class="hub-grid">${cards.map((c, i) => `<li class="hub-card reveal" style="--d:${i}"><a href="${c.href}">
<span class="photo"><img src="${c.img.src}" alt="" width="${c.img.w}" height="${c.img.h}" loading="lazy" decoding="async" sizes="(max-width: 640px) calc(100vw - 32px), 300px"></span>
<span class="hub-label">${esc(c.label)}</span><b>${esc(c.title)}</b>${c.desc ? '<span class="hub-desc">' + esc(c.desc) + '</span>' : ''}<i aria-hidden="true">${ICON.arrow}</i></a></li>`).join('')}</ul></div></section>
${ctaBand(k)}`;
}

export function simplePage({ title, html, after = '' }, k) {
  return '<section class="page-hero no-media"><div class="wrap ph-grid"><div class="ph-text"><h1>' + k.esc(title) + '</h1>' + html + '</div></div></section>' + after + ctaBand(k);
}
