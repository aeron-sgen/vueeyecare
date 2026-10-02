# Vue Eyecare — design C "Iris Editorial"

A complete static rebuild of www.vueeyecare.com. The pages follow the Eye Trends structure (eyetrendsclearlake.com) and the design is new. This project was started over on 2026-10-01 from fresh crawls of both sites.

| | |
|---|---|
| **Content** | Vue Eyecare only. Copy, facts, photography, logos and reviews are read from the browser-rendered capture of www.vueeyecare.com (`audit/rendered`, `audit/content-blocks`). `facts/client-facts.json` cites the source of every value. |
| **Structure** | The Eye Trends information architecture, from a fresh 43-page crawl in `structure-eyetrends/`. Primary nav: Home · About Us · Services (mega menu) · Eyewear (`/products` hub, four cards) · Insurance · Reviews · Visit Us · Schedule. The mega menus open with promo panels and the phone menu drills down, as on Eye Trends. Interior pages are Eye Trends-style full-width bands (no sidebar or breadcrumbs), closing with a related-pages band and the booking band with map. The footer has a brand row and four columns (Eye Care Services · Eyewear · Practice · Visit). The home sections follow Eye Trends' order, each with a label. |
| **Design** | "Iris Editorial": warm paper grounds, Vue's navy as ink, azure links, gold accents, Fraunces over Instrument Sans, photos in plain rounded frames, and an iris-ring motif. See `docs/BRAND-SYSTEM.md`. |
| **Imagery** | The source's own photographs and logos only. Nothing is generated. |

## Layout

| path | what |
|---|---|
| `dist/` | the site to deploy (see `docs/DEPLOY.md`) |
| `src/tools/build.mjs` | the generator: content → pages, redirects, sitemap, search index, headers |
| `src/tools/routes.mjs` | every Vue URL mapped to its place in the Eye Trends structure; the art slots; the removals |
| `src/tools/design.mjs` | the chrome and page templates (header, mega menus, drawer, footer, interior, reviews, hub) |
| `src/tools/home.mjs` | the home page. It throws if a label is not in the source text verbatim. |
| `src/tools/facts.mjs` | writes `facts/client-facts.json` from the captured source |
| `src/tools/extract-blocks.mjs` | rendered source DOM → ordered content blocks |
| `src/tools/logo-ink.mjs` | measures each logo's ink box in headless Chrome → `audit/logo-ink.json` (run after a build, then build again; only needed when logos change) |
| `src/tools/plan-apply.mjs` | change-control decisions, each with evidence (`audit/change-control.json`) |
| `src/tools/resolve-audit.mjs` | closes render-risk and recorded failures, each with its reason |
| `src/styles/tokens.css` | every design value; `audit/source-tokens.css` keeps the source's measured tokens |
| `structure-eyetrends/` | the Eye Trends crawl (structure evidence only; none of its content is used) |
| `audit/` | crawl, captures, parity, fabrication, decontamination, sweep, pixel diff and gate evidence |

## Rebuild

```
node src/tools/facts.mjs
node src/tools/build.mjs
```

Then run the evidence chain: sr-seo, resolve-audit, parity, fabrication, decontaminate, plan-apply, screenshots, pixeldiff, sweep and gate, in that order (`docs/CHANGE-LOG.md` lists it).

To preview locally: `node ~/.claude/skills/site-reforge/scripts/sr-serve.mjs --root dist --port 8813 --no-open`.

## Open for the practice

- **Header phone label.** The source labels the header Call button "(303) 979-4505", but the button dials (225) 752-2419. The rebuild shows (225) 752-2419 (operator decision, 2026-10-01).
- **Home "Myopia Control" card.** It carries the eye-emergency paragraph on the source. It is kept verbatim. The practice should supply the intended copy.
- **Footer "Sitemap" link.** It returns 404 on the source. The rebuild ships `sitemap.xml` and 301s `/sitemap` to `/`.
- **Photo licences.** The stock photography is the source site's own, and its licences carry over only if the practice holds them.
