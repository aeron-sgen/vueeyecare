// Route map: every crawled Vue Eyecare URL -> its place in the Eye Trends information architecture.
// Structure source: structure-eyetrends/ (fresh 43-page crawl of eyetrendsclearlake.com, 2026-10-01). Its header:
//   Home · About Us (= /our-doctor) · Services (mega: exams / children / medical / emergency / contacts groups) ·
//   Eyewear (= /products hub; cards Designer Frames · Sunglasses · Kids' Eyewear · Contact Lenses) · Insurance ·
//   Reviews · Visit Us (= the location page /eye-doctor-clear-lake) · Book an Eye Exam · Call.
//   Its footer: Eye Care Services · Eyewear · Practice · Visit. It has no contact page (the location page is it).
// Content source:   audit/rendered + audit/content-blocks (browser-rendered Vue Eyecare evidence).
// Every moved URL gets a 301 in dist/_redirects. build.mjs throws on a crawled page with no route here.

export const SITE = 'https://www.vueeyecare.com';
export const SITE_HOST = /(^|\.)vueeyecare\.com$/i;

export const ROUTES = [
  // ── core / practice
  ['/', '/', 'home'],
  ['/our-eye-doctors', '/our-doctor', 'practice'],                         // Eye Trends "About Us"
  ['/team/pt-dinh-od-ms-iacmm', '/our-doctor/dr-pt-dinh', 'practice'],
  ['/location/vue-eyecare', '/eye-doctor-baton-rouge', 'practice'],        // Eye Trends "Visit Us": /eye-doctor-clear-lake
  ['/hours-location', '/eye-doctor-baton-rouge/hours', 'practice'],         // hours live under the location page
  ['/contact-us', '/contact', 'practice'],                                  // no Eye Trends equivalent; kept
  ['/insurance', '/insurance', 'insurance'],
  ['/insurance/carecredit', '/insurance/carecredit', 'insurance'],
  ['/insurance/faqs-of-vision-insurance-plans', '/insurance/vision-insurance-faqs', 'insurance'],
  ['/insurance/whats-in-your-vision-insurance-plan', '/insurance/whats-in-your-vision-plan', 'insurance'],

  // ── services (Eye Trends: /services + flat /services/<slug> children)
  ['/eye-care-services', '/services', 'services'],
  ['/eye-care-services/eye-exams', '/services/comprehensive-eye-exams', 'svc-exams'],
  ['/eye-care-services/myopia-management', '/services/myopia-management', 'svc-kids'],
  ['/eye-care-services/management-of-ocular-diseases', '/services/medical-eye-care', 'svc-medical'],
  ['/eye-care-services/management-of-ocular-diseases/glaucoma-testing-treatment', '/services/glaucoma-management', 'svc-medical'],
  ['/eye-care-services/management-of-ocular-diseases/treating-diabetic-retinopathy', '/services/diabetic-eye-exams', 'svc-medical'],
  ['/eye-care-services/management-of-ocular-diseases/treating-macular-degeneration', '/services/macular-degeneration', 'svc-medical'],
  ['/eye-care-services/management-of-ocular-diseases/cataract-surgery-co-management', '/services/cataract-co-management', 'svc-medical'],
  ['/eye-care-services/lasik-refractive-surgery-co-management', '/services/lasik-co-management', 'svc-medical'],
  ['/eye-care-services/eye-conditions', '/services/eye-conditions', 'svc-medical'],
  ['/eye-care-services/eye-conditions/dry-eye-disease-and-treatment', '/services/dry-eye-treatment', 'svc-medical'],
  ['/eye-care-services/eye-emergencies-pinkred-eyes', '/services/emergency-eye-care', 'svc-emergency'],
  ['/eye-care-services/contact-lens-exams', '/services/contact-lens-exams', 'svc-contacts'],
  ['/eye-care-services/contact-lens-exams/hard-to-fit', '/services/specialty-contacts', 'svc-contacts'],
  ['/contact-lenses/toric-contact-lenses-for-astigmatism', '/services/toric-contacts', 'svc-contacts'],

  // ── eyewear (Eye Trends: /products hub + /products/<card>). Vue's eyeglasses page is its designer-frames page.
  ['/eyeglasses', '/products/designer-frames', 'eyewear'],
  ['/contact-lenses', '/products/contact-lenses', 'eyewear'],
  ['/contact-lenses/contact-lenses-for-the-hard-to-fit-patient', '/products/contact-lenses/hard-to-fit', 'eyewear'],
  ['/contact-lenses/eye-exams-for-contact-lenses', '/products/contact-lenses/eye-exams-for-contacts', 'eyewear'],
  ['/promotions', '/products/promotions', 'eyewear'],

  // ── legal
  ['/privacy-policy', '/privacy-policy', 'legal'],
  ['/disclaimer', '/disclaimer', 'legal'],
  ['/website-accessibility-policy', '/accessibility', 'legal'],
];

// Art slots: the source's own images (assets/), chosen per slot by subject. Stems are matched against the
// downloaded files by build.mjs (largest downloaded variant wins); it throws on a stem not downloaded.
// Design C ships ONLY the source's own photography: no generated imagery (audit/generated-art.json is absent).
export const SOURCE_ART = {
  'hero': 'shutterstock-331479137',                                  // the source home hero
  'doctor': 'a1b72014-53e8-41f7-b0d9-76a76a0b02f3',                 // real: Dr. P.T. Dinh
  'logo': 'VUE-LOGO-PHOTOSHOP-no-highlight-I-shadow-copy',          // the practice logo
  'exam': 'shutterstock-394120591',                                  // our-eye-doctors hero
  'family': 'family-sitting-on-beige-couch',
  'kids': 'shutterstock-2036186198',
  'contacts': 'shutterstock_1969470751',
  'contact-finger': 'shutterstock_2430481643',
  'contact-exam': 'shutterstock_1565916823',
  'frames': 'shutterstock_2283445965',
  'man-glasses': 'shutterstock-334374272',
  'insurance': 'shutterstock_2728711507',
  'screen': 'shutterstock-1859216560',
  'emergency': 'close-up-of-an-eye-with-a-crosshair-overlay',
  'senior': 'shutterstock-1989220913',
  'hug': 'shutterstock-2282529567',
  'outdoors': 'group-people-sitting-blanket-grassy-field-dog',
  'friends': 'shutterstock-331479137',
};

export const UPSCALE = [];
export const ENHANCE = {};
// No re-imaging in design C: every photo is the one the source used.
export const REIMAGE = {};
// The source has no forms of its own (contact-us is address + phone only; booking is the Adit scheduler).
export const LIVE_FORMS = {};
// The crawl recorded no redirecting alias paths.
export const ALIASES = {};
// Removals: [pattern, reason, 301 target]. Every other crawled page is content and is rebuilt.
export const REMOVALS = [
  [/^\/sitemap$/, 'Source 404: the footer "Sitemap" link points at a page the source never had; replaced by sitemap.xml', '/'],
];
