# Crawl provenance

## www.vueeyecare.com (content source), 2026-10-01

- **Authorisation.** Vue Eyecare is a client, so the crawl ran with `--own-site`. robots.txt is `Allow: /`, so nothing would have been excluded anyway.
- **Why a preload was used.** sr-crawl always probes `/wp-sitemap.xml`, and this host answers that one path with an empty reply. The crawler reads that as a whole-host refusal.
  - The crawl and asset download ran with `node --import skip-wp-sitemap.mjs`.
  - The preload answers only that one URL with a synthetic 404, so the URL is never requested.
  - The user agent, pacing and fetch layer are unchanged, with no retries past a refusal.
- **Result.**
  - 33 HTML pages (from 35 sitemap entries).
  - 956/956 images downloaded and 5/5 webfonts, with 0 failed.
  - All 33 pages were also rendered in headless Chrome (`audit/rendered/`).
- **One failure.** `/sitemap` returns 404 and is linked from the source footer. This is a source defect, accepted in `audit/failures.json`.
- **Visual baseline.** Computed-style capture of the home page at 390/768/1024/1440, plus one scroll pass at 1440.
  - This capture recorded 0 live animations and 0 keyframes.
  - The earlier run (`../vue-eyecare`) recorded 1 keyframe and 68 animated elements on the same page.
  - The difference is noted, not explained.

## eyetrendsclearlake.com (structure source), 2026-10-01

- **Location.** Crawled into `structure-eyetrends/` with robots.txt obeyed (not our site).
- **Result.** 43 pages, 0 failed, not truncated. Source platform detected: SGEN.
- **Use.** Only the navigation, footer columns, URL scheme and home section order are used. No Eye Trends copy, facts or imagery is in the rebuild.
