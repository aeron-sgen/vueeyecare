// Vue Eyecare (design C) — progressive enhancement only. Every page is fully usable without this file.
(function () {
  var doc = document;

  // Sticky header state: a class the stylesheet uses to tighten the bar once the page has scrolled.
  var root = doc.documentElement;
  function onScroll() { root.classList.toggle('is-scrolled', window.scrollY > 12); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Desktop mega menus: click/Enter toggles, Escape and outside click close.
  var items = doc.querySelectorAll('.nav .has-mega');
  function closeAll(except) {
    items.forEach(function (li) {
      if (li === except) return;
      li.classList.remove('open'); li.pinned = false;
      var b = li.querySelector('button'); if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  // Hover opens a menu on mouse devices; a click must not then close it (the old toggle did exactly that, so a
  // hover-then-click user never reached the links). A click pins the menu open; only a click on a pinned menu,
  // Escape or a click outside closes it. Leaving the menu closes it after a short delay, so crossing the gap
  // between the button and the panel does not shut it.
  var canHover = function () { return matchMedia('(hover: hover)').matches; };
  items.forEach(function (li) {
    var btn = li.querySelector('button');
    var timer = null;
    function setOpen(open) { if (open) closeAll(li); li.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); if (!open) li.pinned = false; }
    btn.addEventListener('click', function () {
      clearTimeout(timer);
      if (li.classList.contains('open') && !li.pinned && canHover()) { li.pinned = true; return; }   // opened by hover: keep it
      var open = !li.classList.contains('open');
      setOpen(open); li.pinned = open;
    });
    li.addEventListener('mouseenter', function () { if (!canHover()) return; clearTimeout(timer); if (!li.classList.contains('open')) setOpen(true); });
    li.addEventListener('mouseleave', function () { if (!canHover() || li.pinned) return; clearTimeout(timer); timer = setTimeout(function () { setOpen(false); }, 280); });
  });
  doc.addEventListener('click', function (e) { if (!e.target.closest('.has-mega')) closeAll(); });

  // Mobile drawer with focus return.
  var drawer = doc.getElementById('drawer');
  var opener = doc.querySelector('.header-cta .menu-toggle');
  // Drill-down views (Eye Trends' phone menu): the root list, and one submenu per [data-drill] with a Back button.
  var views = drawer ? drawer.querySelectorAll('.dv') : [];
  var lastDrill = null;
  function showView(name, focusEl) {
    views.forEach(function (v) {
      var on = v.getAttribute('data-view') === name;
      v.hidden = !on;
      v.classList.toggle('enter', on && name !== 'root');
    });
    var panel = drawer.querySelector('.drawer-panel'); if (panel) panel.scrollTop = 0;
    if (focusEl) focusEl.focus();
  }
  if (drawer) {
    drawer.querySelectorAll('[data-drill]').forEach(function (b) {
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function () {
        lastDrill = b; b.setAttribute('aria-expanded', 'true');
        var v = drawer.querySelector('.dv[data-view="' + b.getAttribute('data-drill') + '"]');
        showView(b.getAttribute('data-drill'), v && v.querySelector('[data-back]'));
      });
    });
    drawer.querySelectorAll('[data-back]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (lastDrill) lastDrill.setAttribute('aria-expanded', 'false');
        showView('root', lastDrill);
      });
    });
  }
  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('open', open);
    if (opener) opener.setAttribute('aria-expanded', String(open));
    doc.body.style.overflow = open ? 'hidden' : '';
    if (open) { var f = drawer.querySelector('a,button'); if (f) f.focus(); }
    else {
      if (views.length) { showView('root'); if (lastDrill) lastDrill.setAttribute('aria-expanded', 'false'); }
      if (opener) opener.focus();
    }
  }
  if (opener) opener.addEventListener('click', function () { setDrawer(true); });
  if (drawer) drawer.querySelectorAll('[data-close]').forEach(function (el) { el.addEventListener('click', function () { setDrawer(false); }); });
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeAll();
    if (drawer && drawer.classList.contains('open')) setDrawer(false);
  });

  // Reveal on scroll. Reduced motion: CSS already shows everything; skip observers entirely.
  var els = doc.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  // Site search: /search/?q=… ranks pages from /search-index.json (title > description > body).
  var results = doc.getElementById('search-results');
  if (results) {
    var q = (new URLSearchParams(location.search).get('q') || '').trim();
    var input = doc.getElementById('search-q');
    var status = doc.getElementById('search-status');
    if (input) input.value = q;
    if (q) {
      status.textContent = 'Searching…';
      // data-base on <html> is set only by the subfolder preview build (src/tools/preview.mjs); production has none.
      var BASE = doc.documentElement.getAttribute('data-base') || '';
      fetch(BASE + '/search-index.json').then(function (r) { return r.json(); }).then(function (idx) {
        var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
        var hits = idx.map(function (p) {
          var t = p.t.toLowerCase(), d = p.d.toLowerCase(), x = p.x.toLowerCase(), s = 0;
          terms.forEach(function (w) { if (t.indexOf(w) > -1) s += 10; if (d.indexOf(w) > -1) s += 4; if (x.indexOf(w) > -1) s += 1; });
          return { p: p, s: s };
        }).filter(function (h) { return h.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 25);
        status.textContent = hits.length + (hits.length === 1 ? ' result' : ' results') + ' for “' + q + '”';
        hits.forEach(function (h) {
          var li = doc.createElement('li'), a = doc.createElement('a'), b = doc.createElement('b'), sp = doc.createElement('span');
          a.href = BASE + h.p.u; b.textContent = h.p.t; sp.textContent = h.p.d || h.p.x.slice(0, 180) + '…';
          a.appendChild(b); a.appendChild(sp); li.appendChild(a); results.appendChild(li);
        });
      }).catch(function () { status.textContent = 'Search is unavailable right now.'; });
    }
  }

  // Forms without a configured processor: explain instead of posting into a void.
  doc.querySelectorAll('form[data-needs-backend]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (form.getAttribute('data-backend-ready') === 'true') return;
      e.preventDefault();
      var n = form.querySelector('.notice');
      if (n) { n.setAttribute('role', 'alert'); n.textContent = 'Online submission is not connected yet. Please call the office to complete this request.'; n.scrollIntoView({ block: 'center' }); }
    });
  });

  // Carousels: a native scroll-snap track (swipe, trackpad and keyboard work without JS); the
  // prev/next buttons page it by roughly one view, disable at either end and show only if it overflows.
  doc.querySelectorAll('[data-carousel-nav]').forEach(function (nav) {
    var track = doc.getElementById(nav.getAttribute('data-carousel-nav'));
    if (!track) return;
    var btns = nav.querySelectorAll('[data-dir]');
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      nav.hidden = max <= 4;
      btns.forEach(function (b) {
        var atEnd = +b.getAttribute('data-dir') < 0 ? track.scrollLeft <= 4 : track.scrollLeft >= max - 4;
        b.disabled = atEnd;
      });
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        track.scrollBy({ left: +b.getAttribute('data-dir') * Math.max(track.clientWidth * 0.85, 240), behavior: still ? 'auto' : 'smooth' });
      });
    });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    // Mouse drag-to-scroll (desktop). Touch and pen keep the browser's native swipe. Snap is
    // suspended while dragging, then the track settles on the nearest slide, biased toward the
    // drag direction. A drag of more than a few pixels swallows the click, so releasing over a
    // card does not open it; a plain click still does.
    var drag = null, moved = false;
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: track.scrollLeft, id: e.pointerId };
      moved = false;
    });
    track.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!moved && Math.abs(dx) < 6) return;
      if (!moved) { moved = true; track.setPointerCapture(e.pointerId); track.classList.add('is-dragging'); }
      track.scrollLeft = drag.left - dx;
    });
    function release(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var wasDrag = moved, dir = track.scrollLeft - drag.left;
      drag = null;
      if (!wasDrag) return;
      var slides = [].slice.call(track.children), base = slides[0].offsetLeft, best = 0, bestD = Infinity;
      slides.forEach(function (s, i) {
        var pos = s.offsetLeft - base, d = Math.abs(pos - track.scrollLeft);
        if (dir > 0 && pos < track.scrollLeft - 2) d += 1e4;      // dragged forward: prefer the next slide
        if (dir < 0 && pos > track.scrollLeft + 2) d += 1e4;      // dragged back: prefer the previous one
        if (d < bestD) { bestD = d; best = pos; }
      });
      track.scrollTo({ left: Math.min(best, track.scrollWidth - track.clientWidth), behavior: still ? 'auto' : 'smooth' });
      setTimeout(function () { track.classList.remove('is-dragging'); }, still ? 0 : 420);
    }
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  });
})();
