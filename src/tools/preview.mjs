// Builds a subfolder preview (e.g. GitHub Pages project site) from dist/ into _site/.
// usage: node src/tools/preview.mjs /Visionproeyecare-2
//
// dist/ is written for the domain root: every link and asset starts with "/". A project
// Pages site lives under /<repo>/, so this copy prefixes those paths with the base, sets
// <html data-base> for site.js (site search), and marks the preview noindex so it never
// competes with the live practice site in search results. dist/ itself is not modified.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '_site');
const BASE = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^\/[A-Za-z0-9._-]+$/.test(BASE)) {
  console.error('usage: node src/tools/preview.mjs /<base-path>   e.g. /Visionproeyecare-2');
  process.exit(1);
}

// "/x" but not "//host" (protocol-relative) and not already prefixed.
const rootPath = new RegExp('^/(?!/)(?!' + BASE.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(/|$))');
const fix = (p) => (rootPath.test(p) ? BASE + p : p);

const rewriteHtml = (html) => html
  .replace(/\b(href|src|action|poster)="([^"]*)"/g, (m, attr, v) => attr + '="' + fix(v) + '"')
  .replace(/\bsrcset="([^"]*)"/g, (m, v) => 'srcset="' + v.split(',').map((c) => { const [u, ...d] = c.trim().split(/\s+/); return [fix(u), ...d].join(' '); }).join(', ') + '"')
  .replace(/url\((&quot;|'|")?(\/[^)'"&]*)(&quot;|'|")?\)/g, (m, q1, p, q2) => 'url(' + (q1 || '') + fix(p) + (q2 || '') + ')')
  .replace(/<html\b([^>]*)>/i, (m, attrs) => '<html' + attrs + ' data-base="' + BASE + '">')
  .replace(/<head>/i, '<head>\n<meta name="robots" content="noindex, nofollow">');

const rewriteCss = (css) => css.replace(/url\((['"]?)(\/[^)'"]*)\1\)/g, (m, q, p) => 'url(' + q + fix(p) + q + ')');

fs.rmSync(OUT, { recursive: true, force: true });
let html = 0, css = 0, other = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const src = path.join(dir, e.name);
    const dst = path.join(OUT, path.relative(DIST, src));
    if (e.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); walk(src); continue; }
    if (e.name === '_redirects' || e.name === '_headers') continue; // Netlify/Cloudflare syntax; GitHub Pages ignores it
    if (e.name.endsWith('.html')) { fs.writeFileSync(dst, rewriteHtml(fs.readFileSync(src, 'utf8'))); html++; }
    else if (e.name.endsWith('.css')) { fs.writeFileSync(dst, rewriteCss(fs.readFileSync(src, 'utf8'))); css++; }
    else { fs.copyFileSync(src, dst); other++; }
  }
};
fs.mkdirSync(OUT, { recursive: true });
walk(DIST);
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log('_site/ preview for base ' + BASE + ': ' + html + ' html, ' + css + ' css rewritten, ' + other + ' files copied');
