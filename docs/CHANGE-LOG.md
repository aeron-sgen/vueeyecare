# Change log — www.vueeyecare.com → design C

## 2026-10-01 — started over from scratch

The operator asked for a restart: new project folder, fresh crawls of both sites, new design. The earlier designs A2 ("Daylight Glass", `../vue-eyecare`) and B2 ("Optical Pop", `../vue-eyecare-b`) are untouched.

**What was reused.** The generator mechanics: build, parity plumbing, facts extraction, block extraction, change-control and audit resolution. All of them were re-run against this project's own fresh evidence, and the derived facts match the earlier capture exactly.

**What is new.**
- The route map, built from the fresh Eye Trends crawl.
- The `/products` eyewear hub.
- The whole design: `design.mjs`, `home.mjs`, `tokens.css`, `site.css` and the fonts.

## 2026-10-01 — arch photo frames removed

Operator request ("can we not do the arched photo"). Every photo frame is now a plain rounded rectangle (token `--photo-r`), and the class `.arch` became `.photo`. The feature photos' single large curved corner went with it. The doctor's circular portrait is unchanged. The iris rings behind the home and interior hero photos only framed the arch, so they and the ring rotation were removed too.

## 2026-10-01 — balanced logos, equal-height image rows

Operator request: "balance out the brands" and "make the sections with image and content the same height".
- **Logos.** The hairline grid was replaced by centred tiles, with column counts chosen per breakpoint (desktop: 7 per row, last row 6, for both). Each logo is cropped to its measured ink box and sized to equal visual area.
- **Feature rows.** The photo now matches its copy height. Measured equal at 901, 1024, 1280, 1440 and 1920px.

## 2026-10-01 — mobile check

All 36 pages were checked at 360, 390 and 414px for zoom-out, elements past the edge, clipped text and tap targets under 44px. The probe was proven against planted defects first. Fixes:
- The footer search form was 4px too wide at 360px.
- One review is written without spaces after its commas, which made one unbreakable run; /reviews zoomed out at 360px. Its text is kept verbatim and now wraps.
- The home rating seal had gold stars on a gold circle, invisible at every width, with the first one poking out of the circle on phones. They are now navy and centred.
- On phones, care-card and eyewear-hub photos are 4:3, and the doctor portrait is capped at 300px.

## 2026-10-02 — modern look

Operator: "work with what we got and make it have a modern feel and look to it". Content, structure and brand colours are unchanged; the visual layer is new. See docs/BRAND-SYSTEM.md for the list. Every text colour pair was re-checked (lowest: 4.91:1, white on azure). The hero still fits and stays alone on the first screen at 1024×600 through 1905×940; in the 901–1180px range the headline is capped by width, because the bolder sans wraps sooner.

## 2026-10-02 — Eye Trends structure audit, every gap closed

Operator: "recheck and audit if we have grabbed the eyetrends structure", then "do all of them". The crawl was re-checked against the live Eye Trends site first: the sitemap (43 pages), header links (82), footer links (23) and home heading order are unchanged.

Changes:
1. **Interior pages.** These are now Eye Trends' band layout. The hero has a label (the page's navigation group), the H1, a lead line and actions. Vue's copy is split into full-width bands, one per source H2, on alternating grounds. A related-pages band uses each page's own H1 and meta description. The booking band closes the page. The sidebar and breadcrumbs are gone (Eye Trends has neither). Legal pages stay one continuous band.
2. **Header.**
   - "About Us" is a plain link to /our-doctor/.
   - Both mega menus open with a promo panel. Services uses Vue's "Quality Eye Care & Treatment" and the services page meta description; Eyewear uses "Eyeglasses at Vue Eyecare" and that page's meta description. Both carry the Schedule Appointment button.
   - Services column heads are links.
   - Eyewear cards are icon, title and the page's own description.
3. **Footer.**
   - The booking band is Eye Trends' split layout: label, heading, address and hours line, actions, and the map beside it. The home Visit Us section is now address, phone and hours only, like Eye Trends' NAP block.
   - A brand row carries the doctor credit line (facts: credentials, role, city).
   - There are four separate columns (Eye Care Services, Eyewear, Practice, Visit). Visit carries the address, phone, hours, Hours & Location, Schedule an Appointment and Directions.
4. **Home.**
   - Every section has a label (navigation labels only).
   - Frames and insurance are separate sections.
   - The intro gains one of Vue's own photos and a stats strip built only from facts: 5.0 average from 20 reviews, 1 eye doctor, Mon–Fri hours.
5. **Phone menu.** It is Eye Trends' drill-down. Services and Eyewear open a submenu with Back and the booking link first. Focus moves to Back, Back returns focus to the item that opened the submenu, and closing resets to the root list.

Not reproducible without inventing content: the 18 Eye Trends pages Vue has no content for, and the home "chain vs us", kids and doctor-quote sections. Parity recall moved 0.9901 → 0.9896. Tracing the 4 pages that dipped showed no word left the site: only repeats the removed sidebar used to supply (Friday/Saturday/Sunday in its hours table, Macular Degeneration in its link list).

## 2026-10-01 — hero isolated on the first screen

Operator request: "can the quote after the hero section be in the next so the hero is isolated". The home hero now fills the first screen under the header (min-height 100svh minus `--hero-offset`), with its content centred vertically. The intro standfirst ("We believe eyes are vital…") therefore starts exactly at the fold and gets its own top spacing. Measured: hero bottom = intro top = window height at 1024×600 through 1905×940; on phones the intro was already below the first screen.

## 2026-10-01 — home hero fitted to the first screen

Operator request: "fit one section when loaded into the preview, basically scale it down by 20%".

The home hero's type, photo, spacing, rating seal and doctor chip are now 80% of their former size (token `--hero-scale`). The heading and the photo are also capped by the window height left under the utility bar and header (`--hero-offset`). Between 901 and 1180px the hero buttons use the regular size, so they share one row.

Measured in realistic browser windows, the whole section shows on load at 1905×940, 1521×730, 1425×780, 1351×650, 1265×600, 1180×700, 1024×680 and 1024×600. It does not fit a 920×620 window (56px over). On portrait tablets and phones the photo stacks below the text, so the heading, intro and both booking buttons fit the first screen and the photo follows.

## Structure (Eye Trends information architecture)

| Vue URL | rebuild |
|---|---|
| `/our-eye-doctors`, `/team/pt-dinh-od-ms-iacmm` | `/our-doctor`, `/our-doctor/dr-pt-dinh` (Eye Trends "About Us") |
| `/location/vue-eyecare` | `/eye-doctor-baton-rouge` (Eye Trends "Visit Us": `/eye-doctor-clear-lake`) |
| `/hours-location` | `/eye-doctor-baton-rouge/hours` |
| `/contact-us` | `/contact` (Eye Trends has no contact page; kept) |
| `/eye-care-services/**` | `/services/<slug>` (Eye Trends' flat service slugs) |
| `/contact-lenses/toric-contact-lenses-for-astigmatism` | `/services/toric-contacts` |
| `/eyeglasses` | `/products/designer-frames` |
| `/contact-lenses/**` | `/products/contact-lenses/**` |
| `/promotions` | `/products/promotions` |
| `/website-accessibility-policy` | `/accessibility` |

Every moved URL has a 301 in `dist/_redirects`.

## Added (ADD rows in `audit/change-control.json`)

- **`/products/`** (Eyewear hub). Eye Trends' "Eyewear" nav item is a hub; Vue has none. It lists only Vue's own eyewear pages, each with its source H1 and source meta description.
- **`/reviews/`.** All 20 patient reviews in full, from the source's JSON-LD, under the source widget heading "Patient Reviews" with its 5.0 / 20 aggregate.
- **`/search/`.** A static search over the source copy. The Eye Trends footer carries search.
- **`404.html`.** The host's not-found page.

## Removed

- **`/sitemap`.** It is a source 404, linked from the source footer. It is replaced by `sitemap.xml` and 301'd to `/`.

## Corrected

- **Header Call button.** The source labels it "(303) 979-4505", but it dials (225) 752-2419. The rebuild labels it with the number it calls. This was an operator decision on 2026-10-01. As a result, `sr-parity` reports `contact-lost` on every page (C19), by decision.

## Evidence chain (order matters)

facts → build → sr-seo --apply → resolve-audit → sr-parity → sr-fabrication → sr-decontaminate --strict → plan-apply → baseline and rebuild screenshots → sr-pixeldiff → sweep (390/768/1024/1440) → merge → collect → sr-gate.
