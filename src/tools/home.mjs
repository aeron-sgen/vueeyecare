// Home page, design C "Iris Editorial".
// Section order is Eye Trends' home (fresh crawl, structure-eyetrends/): hero · intro · care grid · the doctor ·
// services · designer eyewear · plans accepted · reviews · visit · book. Vue Eyecare copy only.
// Section copy is read from audit/content-blocks/*.json by heading; short labels go through S(), which THROWS
// unless the string is in the rendered source text verbatim. Every source H1/H2/H3 stays a heading element.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const rendered = (base) => JSON.parse(fs.readFileSync(path.join(ROOT, 'audit/rendered', base + '.json'), 'utf8')).bodyText.replace(/\s+/g, ' ');

export function renderHome(page, k) {
  const { esc, inline, ART, localImage, BOOK, EXT, PHONE_CALL, PHONE_NAP, tel, hoursTable, hoursRows, facts, SITE, seo, layout, rewriteHref, imageUse, pages, D, A } = k;
  const { ICON, irisRings } = D;
  const RENDERED = rendered('index');
  const S = (t, src = RENDERED, where = 'home') => { if (!src.includes(t.replace(/\s+/g, ' '))) throw new Error(where + ': string not in the rendered source: ' + t); return t; };
  const B = page.data.blocks;
  const clean = (s) => s.replace(/\s+/g, ' ').trim();
  const hIdx = (h, from = 0) => { const i = B.findIndex((b, j) => j >= from && b.t === 'h' && clean(b.text).startsWith(h)); if (i < 0) throw new Error('home: heading not found in source: ' + h); return i; };
  const Hb = (h) => B[hIdx(h)];
  const htext = (b) => clean(b.text).replace(/\s*»$/, '');
  const hlink = (b) => { const m = (b.html || '').match(/\[\[a href="([^"]+)"\]\]/); return m ? rewriteHref(m[1]) : null; };
  const under = (h) => { const i = hIdx(h); const out = []; for (let j = i + 1; j < B.length && B[j].t !== 'h'; j++) out.push(B[j]); return out; };
  const P = (arr) => arr.map((h) => '<p>' + inline(h) + '</p>').join('');
  const imgBefore = (i) => { for (let j = i - 1; j >= 0 && B[j].t !== 'h'; j--) if (B[j].t === 'img') return B[j]; return null; };
  const use = (src) => { const l = localImage(src); if (l) imageUse.push({ page: '/', src: l.src }); return l; };
  const img = (a, sizes, { lazy = true, alt = '' } = {}) => '<img src="' + a.src + '" alt="' + esc(alt) + '"' + (a.w ? ' width="' + a.w + '" height="' + a.h + '"' : '') + (lazy ? ' loading="lazy"' : ' fetchpriority="high"') + ' decoding="async" sizes="' + sizes + '">';
  const btnFrom = (bs) => { const b = bs.find((x) => x.t === 'btn'); return b ? { href: rewriteHref(b.href), text: b.text } : null; };
  const SZ = { hero: '(max-width: 900px) calc(100vw - 32px), 560px', card: '(max-width: 760px) calc(100vw - 32px), 380px', half: '(max-width: 900px) calc(100vw - 32px), 560px', logo: '160px' };

  // ── hero: the source H1, its first paragraph, and the source's own hero photo with its own alt text
  const h1 = clean(B.find((b) => b.t === 'h' && b.level === 1).text);
  const heroParas = under(h1).filter((b) => b.t === 'p').map((b) => b.html);
  const heroBlock = B.find((b) => b.t === 'img');
  const heroImg = use(heroBlock.src);
  const agg = facts.aggregateRating;
  const rows = hoursRows().filter((r) => r.slots.length);
  const hoursLine = rows.map((r) => (r.from === r.to ? r.from.day : r.from.day + ' – ' + r.to.day) + ' ' + r.slots.join(', ')).join(' · ');

  // ── care grid: "Quality Eye Care & Treatment" + its three H3 cards, each with the photo placed before it
  const qH = Hb('Quality Eye Care');
  const qi = hIdx('Quality Eye Care');
  const careCards = [];
  for (let j = qi + 1; j < B.length && !(B[j].t === 'h' && B[j].level <= 2); j++) {
    if (B[j].t !== 'h' || B[j].level !== 3) continue;
    const im = imgBefore(j);
    const body = []; for (let m = j + 1; m < B.length && B[m].t !== 'h' && B[m].t !== 'img'; m++) if (B[m].t === 'p') body.push(B[m].html);
    careCards.push({ title: htext(B[j]), href: hlink(B[j]), img: im ? use(im.src) : null, alt: im ? im.alt : '', body });
  }
  if (careCards.length !== 3) throw new Error('home: expected 3 care cards, found ' + careCards.length);

  // ── the doctor: "Your Baton Rouge Eye Doctor"
  const dH = Hb('Your Baton Rouge Eye Doctor');
  const dBlocks = under('Your Baton Rouge Eye Doctor');
  const dIntro = dBlocks.filter((b) => b.t === 'p').slice(0, 1).map((b) => b.html);
  const bioFirst = dBlocks.filter((b) => b.t === 'p').slice(1).find((b) => !/Show More|\.{3,}/.test(b.html));
  // the rest of the bio sits behind "Show More" on the source too; kept, behind a native disclosure
  const bioRest = dBlocks.filter((b) => b.t === 'p' && b !== bioFirst && b !== dBlocks.find((x) => x.t === 'p') && !/Show More|\.{3,}/.test(b.html)).map((b) => b.html);
  const dBtn = btnFrom(dBlocks);
  const docName = S('P.T. Dinh, OD, MS, IACMM');

  // ── most popular services: two H3 panels
  const pi = hIdx('Our Most Popular Eye Care Services');
  const pop = [];
  for (let j = pi + 1; j < B.length && !(B[j].t === 'h' && B[j].level <= 2); j++) {
    if (B[j].t !== 'h' || B[j].level !== 3) continue;
    const im = imgBefore(j);
    const body = []; let btn = null;
    // the panel ends at its own button; on the source the reviews widget follows with no heading of its own
    for (let m = j + 1; m < B.length && B[m].t !== 'h' && B[m].t !== 'img'; m++) { if (B[m].t === 'btn') { btn = { href: rewriteHref(B[m].href), text: B[m].text }; break; } if (B[m].t === 'p') body.push(B[m].html); }
    if (!/Contact Lenses|Eye Disease/.test(B[j].text)) continue;
    pop.push({ title: htext(B[j]), href: hlink(B[j]), img: im ? use(im.src) : null, alt: im ? im.alt : '', body, btn });
  }
  if (pop.length !== 2) throw new Error('home: expected 2 popular-service panels, found ' + pop.length);

  // ── designer eyewear (from /eyeglasses) and plans accepted (from /insurance): their own H2 + logos
  const pageOf = (from) => pages.find((p) => p.from === from);
  const logosUnder = (pg, h) => {
    const bl = pg.data.blocks; const i = bl.findIndex((b) => b.t === 'h' && clean(b.text).startsWith(h));
    if (i < 0) throw new Error('home: ' + pg.from + ' has no heading ' + h);
    const out = []; for (let j = i + 1; j < bl.length && !(bl[j].t === 'h' && bl[j].level <= bl[i].level); j++) if (bl[j].t === 'img' && /\.png/i.test(bl[j].src)) { const l = use(bl[j].src); if (l) out.push({ l, alt: bl[j].alt }); }
    return { h: clean(bl[i].text), logos: out };
  };
  const eyewear = logosUnder(pageOf('/eyeglasses'), 'Featured Designer Eyeglasses');
  const plans = logosUnder(pageOf('/insurance'), 'Vision Plans We Accept');
  const medical = logosUnder(pageOf('/insurance'), 'Medical Plans We Accept');
  S(eyewear.h, rendered('eyeglasses'), '/eyeglasses'); S(plans.h, rendered('insurance'), '/insurance');
  const allPlans = plans.logos.concat(medical.logos.filter((m) => !plans.logos.some((p) => p.alt === m.alt)));
  // Balanced logo tiles. Every source logo file shares one 1.21:1 canvas while the mark inside ranges from a hairline
  // wordmark to a full-bleed badge, so each logo is cropped to its measured ink box (audit/logo-ink.json, written by
  // src/tools/logo-ink.mjs) and sized to the same visual area: width = 62px x sqrt(ink aspect), capped at 140px and
  // at the tile. Column counts are picked per breakpoint so the centred last row is as full as possible.
  const INK_FILE = path.join(ROOT, 'audit/logo-ink.json');
  const INK = fs.existsSync(INK_FILE) ? JSON.parse(fs.readFileSync(INK_FILE, 'utf8')).logos : {};
  const pickCols = (n, lo, hi) => { let best = lo, score = -1; for (let c = lo; c <= hi; c++) { const s = (n % c === 0 ? c : n % c) / c; if (s > score + 1e-9 || (Math.abs(s - score) < 1e-9 && c > best)) { best = c; score = s; } } return best; };
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const logoGrid = (arr, label) => {
    const cols = { lg: pickCols(arr.length, 6, 8), md: pickCols(arr.length, 4, 6), sm: pickCols(arr.length, 2, 3) };
    return '<ul class="logo-grid" aria-label="' + esc(label) + '" style="--c-lg:' + cols.lg + ';--c-md:' + cols.md + ';--c-sm:' + cols.sm + '">' + arr.map(({ l, alt }) => {
      const img = '<img src="' + l.src + '" alt="' + esc(alt) + '"' + (l.w ? ' width="' + l.w + '" height="' + l.h + '"' : '') + ' loading="lazy" decoding="async" sizes="' + SZ.logo + '">';
      const ink = INK[path.basename(l.src)];
      if (!ink) return '<li>' + img + '</li>';
      const ar = ink.iw / ink.ih;
      const lw = Math.min(140, Math.round(62 * Math.sqrt(ar)));
      const crop = '--ar:' + r3(ar) + ';--lw:' + lw + ';--sw:' + r3(ink.w / ink.iw * 100) + '%;--sh:' + r3(ink.h / ink.ih * 100) + '%;--sx:' + r3(-ink.x / ink.iw * 100) + '%;--sy:' + r3(-ink.y / ink.ih * 100) + '%';
      return '<li><span class="logo-ink" style="' + crop + '">' + img + '</span></li>';
    }).join('') + '</ul>';
  };

  // ── reviews
  const revH = S('Patient Reviews');
  if (k.reviews.length !== 20) throw new Error('home: expected the 20 source reviews, got ' + k.reviews.length);
  const carouselNav = (id, label) => '<div class="carousel-nav" data-carousel-nav="' + id + '" hidden><button type="button" class="carousel-btn" data-dir="-1" aria-controls="' + id + '" aria-label="Previous ' + label + '">' + ICON.arrowL + '</button><button type="button" class="carousel-btn" data-dir="1" aria-controls="' + id + '" aria-label="Next ' + label + '">' + ICON.arrowR + '</button></div>';

  // Eye Trends gives every home section a short label over its heading; these are navigation labels, not claims.
  const kick = (icon, t) => '<p class="kicker">' + icon + '<span>' + esc(t) + '</span></p>';
  // intro stats strip: only facts/client-facts.json values (rating, review count, the one doctor, opening days)
  const firstOpen = rows[0];
  const openDays = firstOpen.from === firstOpen.to ? firstOpen.from.day.slice(0, 3) : firstOpen.from.day.slice(0, 3) + '–' + firstOpen.to.day.slice(0, 3);
  const openHours = firstOpen.slots.join(', ');
  const arrowLink = (href, text) => '<a class="link-arrow" href="' + href + '">' + esc(text) + ' ' + ICON.arrow + '</a>';
  const card = (c, i) => '<li class="care-card reveal" style="--d:' + i + '">'
    + (c.img ? '<span class="photo">' + img(c.img, SZ.card, { alt: c.alt }) + '</span>' : '')
    + '<h3>' + (c.href ? '<a href="' + c.href + '">' + esc(c.title) + '</a>' : esc(c.title)) + '</h3>'
    + P(c.body) + '</li>';

  const body = `
<section class="home-hero" aria-labelledby="hero-h1"><div class="wrap hero-grid">
<div class="hero-copy">
<p class="kicker">${ICON.iris}<span>${esc(facts.brand)} · ${esc(A.city)}, ${esc(A.region)}</span></p>
<h1 id="hero-h1">${esc(h1)}</h1>
<div class="lead">${P(heroParas.slice(0, 1))}</div>
<div class="hero-actions"><a class="btn btn-ink btn-lg" href="${BOOK}"${EXT}>${ICON.calendar} Schedule Appointment</a><a class="btn btn-line btn-lg" href="${tel(PHONE_CALL)}">${ICON.phone} Call ${esc(PHONE_CALL)}</a></div>
<ul class="hero-facts">
<li>${ICON.pin}<a href="/eye-doctor-baton-rouge/">${esc(A.line)}</a></li>
<li>${ICON.clock}<a href="/eye-doctor-baton-rouge/hours/">${esc(hoursLine)}</a></li>
</ul>
</div>
<figure class="hero-media"><span class="photo">${img(heroImg, SZ.hero, { lazy: false, alt: heroBlock.alt || heroImg.alt })}</span>
<a class="seal" href="/reviews/"><span class="stars" aria-hidden="true">${ICON.star.repeat(5)}</span><b>${esc(agg.ratingValue)}</b><span>${esc(agg.reviewCount)} ${esc(revH.toLowerCase())}</span></a>
<a class="doc-chip" href="/our-doctor/dr-pt-dinh/"><span class="dc-avatar">${img(ART.doctor, '52px', { alt: '' })}</span><span><b>${esc(docName)}</b><small>${esc(facts.people[0].role)}</small></span></a>
</figure>
</div></section>

<section class="intro" aria-label="About ${esc(facts.brand)}"><div class="wrap">
<div class="intro-grid"><div class="intro-copy reveal">${kick(ICON.iris, 'About Us')}${P(heroParas.slice(1))}</div>
<figure class="intro-photo reveal"><span class="photo">${img(ART.family, SZ.half, { alt: '' })}</span></figure></div>
<ul class="stats reveal" aria-label="${esc(facts.brand)} at a glance">
<li><b>${esc(agg.ratingValue)}<span aria-hidden="true"> ★</span></b><span>average rating from ${esc(agg.reviewCount)} patient reviews</span></li>
<li><b>${esc(agg.reviewCount)}</b><span>patient reviews, all on our <a href="/reviews/">reviews page</a></span></li>
<li><b>1</b><span>eye doctor: ${esc(docName)}</span></li>
<li><b>${esc(openDays)}</b><span>${esc(openHours)}</span></li>
</ul>
</div></section>

<section class="section" aria-labelledby="care-h"><div class="wrap">
<div class="section-head reveal"><div>${kick(ICON.iris, 'Eye Care')}<h2 id="care-h">${esc(clean(qH.text))}</h2></div>${arrowLink('/services/', 'All eye care services')}</div>
<ul class="care-grid">${careCards.map(card).join('')}</ul>
</div></section>

<section class="section ink doctor" aria-labelledby="doc-h"><div class="wrap doc-grid">
<figure class="doc-photo reveal"><span class="ring">${img(ART.doctor, SZ.half, { alt: docName })}</span></figure>
<div class="doc-copy reveal">
${kick(ICON.iris, 'Our Eye Doctor')}<h2 id="doc-h">${esc(clean(dH.text))}</h2>
${P(dIntro)}
<h3><a href="/our-doctor/dr-pt-dinh/">${esc(docName)}</a></h3>
${bioFirst ? '<p>' + inline(bioFirst.html) + '</p>' : ''}
${bioRest.length ? '<details class="more"><summary>' + esc(S('Show More')) + '</summary>' + P(bioRest) + '</details>' : ''}
<p class="actions">${dBtn ? '<a class="btn btn-gold" href="' + dBtn.href + '">' + esc(dBtn.text) + '</a>' : ''}<a class="btn btn-line-light" href="${BOOK}"${EXT}>${ICON.calendar} Schedule Appointment</a></p>
</div>
</div></section>

<section class="section" aria-labelledby="pop-h"><div class="wrap">
<div class="section-head reveal"><div>${kick(ICON.iris, 'Services')}<h2 id="pop-h">${esc(clean(B[pi].text))}</h2></div></div>
<div class="features">${pop.map((c, i) => `<article class="feature${i % 2 ? ' flip' : ''} reveal">
${c.img ? '<figure class="feature-img"><span class="photo">' + img(c.img, SZ.half, { alt: c.alt }) + '</span></figure>' : ''}
<div class="feature-copy"><h3>${c.href ? '<a href="' + c.href + '">' + esc(c.title) + '</a>' : esc(c.title)}</h3>${P(c.body)}
${c.btn ? '<p class="actions"><a class="btn btn-line" href="' + c.btn.href + '">' + esc(c.btn.text) + ' ' + ICON.arrow + '</a></p>' : ''}</div>
</article>`).join('')}</div>
</div></section>

<section class="section sand" aria-labelledby="eyewear-h"><div class="wrap">
<div class="ledger reveal">
<div class="ledger-head"><p class="kicker">${ICON.glasses}<span>Eyewear</span></p><h2 id="eyewear-h">${esc(eyewear.h)}</h2>
<p class="actions"><a class="btn btn-line" href="/products/designer-frames/">Eyeglasses ${ICON.arrow}</a><a class="btn btn-line" href="/products/promotions/">${ICON.tag} Promotions</a></p></div>
${logoGrid(eyewear.logos, eyewear.h)}
</div>
</div></section>

<section class="section" aria-labelledby="plans-h"><div class="wrap">
<div class="ledger reveal">
<div class="ledger-head"><p class="kicker">${ICON.shield}<span>Insurance</span></p><h2 id="plans-h">${esc(plans.h)}</h2>
<p class="actions"><a class="btn btn-line" href="/insurance/">Insurance ${ICON.arrow}</a><a class="btn btn-line" href="/insurance/carecredit/">CareCredit ${ICON.arrow}</a></p></div>
${logoGrid(allPlans, 'Vision and medical plans accepted')}
</div>
</div></section>

<section class="section ink reviews" aria-labelledby="rev-h"><div class="wrap">
<div class="section-head reveal"><div>${kick(ICON.iris, 'Reviews')}<h2 id="rev-h">${esc(revH)}</h2><p class="agg"><span class="stars" aria-hidden="true">${ICON.star.repeat(5)}</span><span><b>${esc(agg.ratingValue)}</b> out of 5 · ${esc(agg.reviewCount)} reviews</span></p></div>
<div class="head-actions">${carouselNav('rev-track', 'reviews')}<a class="btn btn-line-light" href="${facts.links.reviewsGoogle}"${EXT}>${esc(S('Read More Reviews'))}</a></div></div>
<div class="carousel" role="region" aria-roledescription="carousel" aria-labelledby="rev-h"><ul class="review-track carousel-track" id="rev-track" tabindex="0">${k.reviews.map((r) => k.reviewCard(r, { clamp: true })).join('')}</ul></div>
<p class="more-link">${arrowLink('/reviews/', 'All ' + agg.reviewCount + ' patient reviews')}</p>
</div></section>

<section class="section sand" aria-labelledby="visit-h"><div class="wrap visit">
<div class="visit-info reveal"><p class="kicker">${ICON.pin}<span>Visit Us</span></p><h2 id="visit-h"><a href="/eye-doctor-baton-rouge/hours/">Hours &amp; Location</a></h2>
<p class="visit-addr"><b>${esc(facts.brand)}</b><br>${esc(A.street)}<br>${esc(A.city)}, ${esc(A.region)} ${esc(A.postal)}</p>
<p><a class="visit-phone" href="${tel(PHONE_NAP)}">${ICON.phone}${esc(PHONE_NAP)}</a></p>
<p class="actions"><a class="btn btn-ink" href="${BOOK}"${EXT}>${ICON.calendar} Schedule Appointment</a><a class="btn btn-line" href="${facts.links.directions}"${EXT}>Directions ${ICON.arrow}</a></p></div>
<div class="visit-hours reveal">${hoursTable()}</div>
</div></section>
${D.ctaBand(k)}`;

  const s = seo.pages.find((x) => x.url === page.url) || {};
  const t24 = (x) => { const [hm, ap] = x.split(' '); let [h, m] = hm.split(':').map(Number); if (ap === 'PM' && h !== 12) h += 12; if (ap === 'AM' && h === 12) h = 0; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };
  const ld = {
    '@context': 'https://schema.org', '@type': 'Optometrist', name: facts.brand, url: SITE + '/', telephone: PHONE_NAP, image: SITE + ART.hero.src, logo: SITE + ART.logo.src,
    address: { '@type': 'PostalAddress', streetAddress: A.street, addressLocality: A.city, addressRegion: A.region, postalCode: A.postal, addressCountry: A.country },
    openingHoursSpecification: facts.hoursStructured.filter((d) => d.slots.length).flatMap((d) => d.slots.map((sl) => { const [o, c] = sl.split(' - '); return { '@type': 'OpeningHoursSpecification', dayOfWeek: d.day, opens: t24(o), closes: t24(c) }; })),
    aggregateRating: { '@type': 'AggregateRating', ratingValue: agg.ratingValue, reviewCount: agg.reviewCount, bestRating: 5, worstRating: 1 },
    employee: { '@type': 'Person', name: facts.people[0].name, jobTitle: facts.people[0].role },
    sameAs: [facts.links.facebook],
  };
  return layout({ title: s.title || page.data.title, description: s.metaDescription || page.data.description, canonical: SITE + '/', body, current: '/', jsonld: [ld] });
}
