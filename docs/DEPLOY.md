# Deploying

`dist/` is a complete static site. The host runs no build step, and the site has no runtime dependency.

## Any static host

Upload `dist/` as the web root. Paths are root-relative (`/styles/site.css`), so the site must be served from a domain root. For a subfolder preview, run `node src/tools/preview.mjs /<base>`, which writes a prefixed `noindex` copy to `_site/`.

## Redirects and headers

- **`dist/_redirects`**: one permanent (301) redirect per line (`/old  /new/  301`). It covers every Vue URL that moved into the Eye Trends structure (for example `/eyeglasses` → `/products/designer-frames/` and `/hours-location` → `/eye-doctor-baton-rouge/hours/`), plus `/sitemap` (a source 404) → `/`.
  - This is Netlify / Cloudflare Pages syntax.
  - On Apache, write each line as `Redirect 301 /old /new/`.
  - On nginx, write it as `location = /old { return 301 /new/; }`.
- **`dist/_headers`**: HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN` and a Content-Security-Policy. Other hosts need the same headers set in their own configuration.
  - The CSP allows exactly one inline script, the `js` class flag, by its sha256 hash. `build.mjs` recomputes the hash on every build.
  - Frames are allowed only from `maps.google.com`, `google.com` and `youtube-nocookie.com` (the home and location maps).

## Forms

The source has no forms. Contact is phone and address only, and booking is the Adit scheduler. Neither does the rebuild, so no processor needs configuring.

## Booking and outbound links

All of these come from `facts/client-facts.json` → `links`:

- **Schedule Appointment**: `https://p.adit.com/Rx8cZ` on every button, as on the source.
- **Read More Reviews**: the practice's Google reviews.
- **Directions**: the practice's Google Maps place.
- **Facebook**: the practice page.

## Fonts

Fraunces and Instrument Sans are self-hosted as variable WOFF2 in `dist/assets/fonts/` (the latin subset, from Google Fonts). Both are SIL Open Font License. There is no request to Google Fonts at runtime.

## Browser support

- **Header blur.** The sticky header uses `backdrop-filter` with a 92% paper background, so it stays legible where blur is unsupported.
- **Reduced motion.** With "reduce motion" set, the reveal-on-scroll and all hover movement are off.

## Cache

`/assets/*` is cached for 30 days. File names do not change when an image is replaced, so after replacing an asset, purge the host cache or rename the file. Stylesheet and script URLs carry a content hash (`?v=`), so they refresh by themselves.
