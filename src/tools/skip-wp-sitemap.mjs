// Preload for sr-crawl on www.vueeyecare.com: that host closes the connection with an empty reply on
// /wp-sitemap.xml (verified with curl 2026-10-01: "Empty reply from server"), while every real page answers
// 200. sr-crawl always probes that WordPress sitemap guess and reads the reset as a whole-host refusal.
// This answers ONLY that one URL with a synthetic 404 so it is never requested; every other request is
// untouched (same UA, same pacing, same fetch layer).
const real = globalThis.fetch;
globalThis.fetch = (url, opts) => {
  const u = String(url && url.url ? url.url : url);
  if (/^https:\/\/www\.vueeyecare\.com\/wp-sitemap\.xml$/i.test(u)) return Promise.resolve(new Response('', { status: 404 }));
  return real(url, opts);
};
