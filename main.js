/* YOUNITED — Concept B "Foil Fields". Vanilla JS, no dependencies.
   The page is complete without this file: every family, flavour and form field is in the HTML.
   This adds: menu, flavour re-staging, deep links, intent pre-select, form validation/submit,
   sticky CTA, the sticky family index, scroll reveals, the ingredient ribbon and the foil sheen. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  root.classList.add('js');
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileMQ = matchMedia('(max-width: 820px)');
  const stackedMQ = matchMedia('(max-width: 999px)'); // the range stacks its figures above the packs
  const motionOK = () => !reduceMQ.matches;

  const head = $('.masthead');
  const headH = () => head.getBoundingClientRect().height;
  const rangeIndex = $('.range-index');
  // Height of the sticky chrome that currently covers the top of the viewport (header, plus the family index when stuck).
  function chromeNow() {
    const h = headH();
    if (!rangeIndex) return h;
    const r = rangeIndex.getBoundingClientRect();
    return r.top <= h + 1 && r.bottom > h ? Math.max(h, r.bottom) : h;
  }

  /* ------------------------------------------------------------ menu */
  const burger = $('.burger');
  const nav = $('#site-nav');
  const burgerText = $('.burger__text', burger);
  // trap order follows the DOM: logo, menu links, family swatches, menu CTA, burger
  const focusables = () => $$('a[href], button', head).filter(el => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden');
  function openMenu() {
    head.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burgerText.textContent = 'Close menu';
    document.body.classList.add('menu-open');
    updateSticky();
    const first = $('a', nav);
    if (first) requestAnimationFrame(() => first.focus());
  }
  function closeMenu(restore) {
    if (!head.classList.contains('is-open')) return;
    head.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burgerText.textContent = 'Menu';
    document.body.classList.remove('menu-open');
    if (restore) burger.focus();
    updateSticky();
  }
  burger.addEventListener('click', () => (head.classList.contains('is-open') ? closeMenu(false) : openMenu()));
  $$('a', nav).forEach(a => a.addEventListener('click', () => closeMenu(false)));
  document.addEventListener('keydown', e => {
    if (!head.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
    if (e.key !== 'Tab') return;
    const list = focusables();
    const first = list[0], last = list[list.length - 1];
    const inside = head.contains(document.activeElement);
    if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus(); }
  });
  mobileMQ.addEventListener('change', () => closeMenu(false));

  /* ------------------------------------------------------------ foil sheen (decorative)
     A white highlight is swept once across a pack, masked to the pack's own silhouette. The silhouette is drawn from
     the image already on screen into a small canvas and encoded asynchronously (off the main thread where the browser
     can) into a blob: URL, so nothing is downloaded a second time. It is only built the first time a pack sheens. */
  const masks = new WeakMap();
  function maskFor(img) {
    if (masks.has(img)) return masks.get(img);
    const job = new Promise(resolve => {
      if (!img || !img.complete || !img.naturalWidth) { resolve(null); return; }
      const k = Math.min(1, 240 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * k));
      c.height = Math.max(1, Math.round(img.naturalHeight * k));
      try {
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0, c.width, c.height);
        x.globalCompositeOperation = 'source-in';
        x.fillStyle = '#fff';
        x.fillRect(0, 0, c.width, c.height);
        c.toBlob(blob => resolve(blob ? URL.createObjectURL(blob) : null), 'image/webp', 0.7);
      } catch (err) { resolve(null); }
    });
    masks.set(img, job);
    return job;
  }
  function sheen(host, delay = 0) {
    if (!motionOK() || !host) return;
    const run = () => {
      const img = $('img', host);
      maskFor(img).then(url => {
        if (!url || !motionOK()) return;
        let s = $('.sheen', host);
        if (!s) {
          s = document.createElement('span');
          s.className = 'sheen';
          s.setAttribute('aria-hidden', 'true');
          s.style.setProperty('--m', 'url("' + url + '")');
          host.append(s);
        }
        host.classList.remove('is-sheening');
        void host.offsetWidth; // restart the one-pass sweep
        host.classList.add('is-sheening');
        clearTimeout(host._sheenT);
        host._sheenT = setTimeout(() => host.classList.remove('is-sheening'), 1250);
      });
    };
    clearTimeout(host._sheenD);
    if (delay) host._sheenD = setTimeout(run, delay); else run();
  }
  $$('.field').forEach((field, i) => {
    const lead = $('.fp--0', field);
    field.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') sheen(lead); });
    field.addEventListener('focus', () => sheen(lead));
    // once after the "unite" opener, column by column, so touch screens see the signature too
    const img = $('img', lead);
    const go = () => sheen(lead, 1450 + i * 150);
    if (img.complete) go(); else img.addEventListener('load', go, { once: true });
  });

  /* ------------------------------------------------------------ range: flavour selection re-stages the packs */
  const families = $$('[data-family]');
  function upgradePills(fam) {
    $$('span.pill', fam).forEach(span => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = span.className.replace('is-selected', '').trim();
      b.dataset.product = span.dataset.product;
      b.dataset.tint = span.dataset.tint;
      b.textContent = span.textContent;
      b.setAttribute('aria-pressed', span.classList.contains('is-selected') ? 'true' : 'false');
      span.replaceWith(b);
    });
  }
  // keep the pressed pill fully inside the (horizontally scrolling) pill row, without moving the page
  function pillIntoView(fam, smooth) {
    const row = $('.flavours', fam);
    const pill = $('.pill[aria-pressed="true"]', row);
    if (!pill || row.scrollWidth <= row.clientWidth + 1) return;
    const pad = parseFloat(getComputedStyle(row).scrollPaddingLeft) || 24;
    const left = pill.offsetLeft - row.offsetLeft, right = left + pill.offsetWidth;
    const fits = left - pad >= row.scrollLeft && right + 28 <= row.scrollLeft + row.clientWidth;
    // align the pill with its snap position (the row snaps to pill starts), so snapping never undoes it
    if (!fits) row.scrollTo({ left: Math.max(0, left - pad), behavior: smooth && motionOK() ? 'smooth' : 'auto' });
  }
  // A scrolling pill row fades its edges. At its start there is no left fade; once scrolled, the left fade ends where the
  // first whole pill begins, so no sliver of a cut pill shows there. The right edge keeps its cut pill (there is more to
  // swipe) until the row ends.
  $$('.flavours').forEach(row => {
    const mark = () => {
      const max = row.scrollWidth - row.clientWidth;
      const x = p => p.offsetLeft - row.offsetLeft - row.scrollLeft; // a pill's left edge inside the visible row
      const pills = $$('.pill', row);
      const first = pills.find(p => x(p) >= 4);
      const prev = first ? pills[pills.indexOf(first) - 1] : null;
      // keep a keyboard focus ring (3px outline + 3px offset) clear of the fade
      const ring = first && first === document.activeElement && first.matches(':focus-visible') ? 7 : 1;
      const on = max > 2 && row.scrollLeft > 2 && first;
      const fade = on ? Math.max(12, x(first) - ring) : 1;
      // fully transparent up to the cut pill's right edge, so not even its rounded end (a stray ")") shows
      const clear = on && prev ? Math.min(fade, Math.max(fade - 6, x(prev) + prev.offsetWidth + 0.5)) : fade - 6;
      row.style.setProperty('--fade', fade + 'px');
      row.style.setProperty('--fade-0', clear + 'px');
      row.style.setProperty('--fade-r', (max > 2 && row.scrollLeft >= max - 2 ? 1 : 28) + 'px');
    };
    row.addEventListener('scroll', mark, { passive: true });
    row.addEventListener('focusin', mark);
    row.addEventListener('focusout', () => requestAnimationFrame(mark));
    addEventListener('resize', mark);
    document.fonts.ready.then(mark);
    mark();
  });
  function selectProduct(fam, idx, opts = {}) {
    const packs = $$('.pack', fam);
    const pills = $$('.pill', fam);
    if (!packs[idx] || !pills[idx]) return;
    const current = pills.findIndex(p => p.getAttribute('aria-pressed') === 'true');
    const order = [idx, ...packs.map((_, i) => i).filter(i => i !== idx)];
    order.forEach((i, slot) => { packs[i].dataset.slot = String(slot); });
    pills.forEach((p, i) => p.setAttribute('aria-pressed', String(i === idx)));
    $('.spec__flavour', fam).textContent = pills[idx].textContent;
    fam.style.setProperty('--tint', pills[idx].dataset.tint); // field glow and shelf-edge label cross-fade
    fam.dataset.selected = String(idx);
    if (current !== idx && motionOK() && !opts.silent) {
      const p = packs[idx];
      p.classList.remove('is-arriving'); void p.offsetWidth; p.classList.add('is-arriving');
      sheen(p, 300);
    }
    fam.dispatchEvent(new CustomEvent('range:change', { bubbles: true, detail: { id: fam.dataset.family, product: idx } }));
  }
  families.forEach(fam => {
    upgradePills(fam);
    const sel = $$('.pill', fam).findIndex(p => p.getAttribute('aria-pressed') === 'true');
    selectProduct(fam, sel < 0 ? 0 : sel, { silent: true });
    pillIntoView(fam, false);
    $('.flavours', fam).addEventListener('click', e => {
      const b = e.target.closest('button.pill');
      if (!b) return;
      selectProduct(fam, Number(b.dataset.product));
      pillIntoView(fam, true);
      keepStageInView(fam);
    });
  });
  mobileMQ.addEventListener('change', () => families.forEach(f => pillIntoView(f, false)));
  document.fonts.ready.then(() => families.forEach(f => pillIntoView(f, false))); // pill widths settle with the font

  // On small screens a tap must never change an image the reader cannot see.
  function keepStageInView(fam) {
    const stage = $('.stage', fam);
    const r = stage.getBoundingClientRect();
    const top = chromeNow();
    const visible = Math.min(r.bottom, innerHeight) - Math.max(r.top, top);
    if (visible >= r.height * 0.85) return;
    const delta = r.top < top ? r.top - top - 8 : r.bottom - innerHeight + 8;
    scrollBy({ top: delta, behavior: motionOK() ? 'smooth' : 'auto' });
  }

  // Deep links (spotlight CTA → cheese puffs, Belgian Chocolate selected, stage in view).
  function reveal(fam) {
    const stage = $('.stage', fam);
    if (stage) stage.classList.add('is-in');
    fam.classList.add('is-in'); // the figures beside the packs
  }
  $$('[data-select-family]').forEach(a => a.addEventListener('click', e => {
    const fam = families.find(f => f.dataset.family === a.dataset.selectFamily);
    if (!fam) return;
    e.preventDefault();
    selectProduct(fam, Number(a.dataset.selectProduct || 0));
    reveal(fam);
    // land on the family; if it is taller than the screen, keep the packs and the chosen pill in view together
    const chrome = headH() + (rangeIndex ? rangeIndex.offsetHeight : 0);
    const pill = $$('.pill', fam)[Number(a.dataset.selectProduct || 0)];
    const famTop = fam.getBoundingClientRect().top + scrollY - chrome;
    const stageTop = $('.stage', fam).getBoundingClientRect().top + scrollY - chrome - 8;
    const stageBottom = $('.stage', fam).getBoundingClientRect().bottom + scrollY + 12;
    const end = Math.max(stageBottom, pill ? pill.getBoundingClientRect().bottom + scrollY + 16 : 0);
    let top = famTop;
    if (end - top > innerHeight) top = Math.min(Math.max(famTop, stageTop), end - innerHeight);
    if (stageBottom - top > innerHeight) top = stageBottom - innerHeight; // the packs always come first
    scrollTo({ top, behavior: motionOK() ? 'smooth' : 'auto' });
    history.replaceState(null, '', '#family-' + fam.dataset.family);
    if (pill) { pill.focus({ preventScroll: true }); pillIntoView(fam, false); }
  }));

  /* ------------------------------------------------------------ callouts: each leader ends on a pack's foil
     From 1000px a leader runs inwards from its figure (level where it can, at most 20° off); on narrower screens it
     drops from under the label (at most 30° off vertical). It ends 8px inside the nearest visible foil, never crossing
     a figure, another leader or a pack on the way. Silhouettes: a 96px alpha map of each image already on screen,
     mapped through the pack's transform by three probe points; the field clips them. No JS: the CSS leaders stay. */
  const alphaMaps = new Map();
  function alphaOf(img) {
    const key = img.currentSrc || img.src;
    if (alphaMaps.has(key)) return alphaMaps.get(key);
    if (!img.complete || !img.naturalWidth) return null;
    let map = null;
    try {
      const W = 96, H = Math.max(1, Math.round(W * img.naturalHeight / img.naturalWidth));
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, W, H);
      const d = x.getImageData(0, 0, W, H).data, a = new Uint8Array(W * H);
      for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] > 160 ? 1 : 0;
      map = { W, H, a };
    } catch (err) { map = null; }
    alphaMaps.set(key, map);
    return map;
  }
  function probe(host, x, y, fromRight) {
    const i = document.createElement('i');
    i.className = 'cp';
    i.style.top = y;
    i.style[fromRight ? 'right' : 'left'] = x;
    host.append(i);
    return i;
  }
  const PIN = 8, G = 3; // pin inset and grid step, px
  function fitCallouts(fam) {
    const leads = $$('.lead', fam), packs = $$('.pack', fam);
    const maps = packs.map(pk => alphaOf($('img', pk)));
    if (!leads.length || maps.some(m => !m)) return; // an image's load event asks again
    const stacked = stackedMQ.matches;
    const fromRight = l => !stacked && !!l.closest('.readout--r');
    // one layout pass: drop every probe in, read them all, take them out
    const pp = packs.map(pk => [probe(pk, '0', '0'), probe(pk, '100%', '0'), probe(pk, '0', '100%')]);
    const lp = leads.map(l => probe(l, '0', '50%', fromRight(l)));
    const at = i => { const r = i.getBoundingClientRect(); return [r.left, r.top]; };
    const P = pp.map(ps => ps.map(at)), S = lp.map(at);
    const field = $('.family__field', fam).getBoundingClientRect();
    pp.flat().concat(lp).forEach(i => i.remove());
    let x0 = field.right, y0 = field.bottom, x1 = field.left, y1 = field.top;
    const shapes = P.map(([p0, p1, p2], k) => {
      const ex = [p1[0] - p0[0], p1[1] - p0[1]], ey = [p2[0] - p0[0], p2[1] - p0[1]];
      for (const [cx, cy] of [p0, p1, p2, [p1[0] + ey[0], p1[1] + ey[1]]]) {
        x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
      }
      return { p0, ex, ey, det: ex[0] * ey[1] - ex[1] * ey[0], m: maps[k] };
    });
    if (shapes.some(s => Math.abs(s.det) < 1)) return;
    x0 = Math.max(x0, field.left); x1 = Math.min(x1, field.right); y0 = Math.max(y0, field.top); y1 = Math.min(y1, field.bottom);
    const cols = Math.ceil((x1 - x0) / G), rows = Math.ceil((y1 - y0) / G);
    if (cols < 2 || rows < 2 || cols * rows > 5e5) return;
    // the visible silhouette on the grid, then each cell's distance (in cells) to the nearest empty one
    const D = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const dx0 = x0 + (c + 0.5) * G, dy0 = y0 + (r + 0.5) * G;
      for (const s of shapes) {
        const dx = dx0 - s.p0[0], dy = dy0 - s.p0[1];
        const u = (dx * s.ey[1] - dy * s.ey[0]) / s.det, v = (s.ex[0] * dy - s.ex[1] * dx) / s.det;
        if (u >= 0 && v >= 0 && u < 1 && v < 1 && s.m.a[(v * s.m.H | 0) * s.m.W + (u * s.m.W | 0)]) { D[r * cols + c] = 1e6; break; }
      }
    }
    const get = (r, c) => (r < 0 || c < 0 || r >= rows || c >= cols ? 0 : D[r * cols + c]), q = Math.SQRT2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (D[i]) D[i] = Math.min(D[i], get(r, c - 1) + 1, get(r - 1, c) + 1, get(r - 1, c - 1) + q, get(r - 1, c + 1) + q);
    }
    for (let r = rows - 1; r >= 0; r--) for (let c = cols - 1; c >= 0; c--) {
      const i = r * cols + c;
      if (D[i]) D[i] = Math.min(D[i], get(r, c + 1) + 1, get(r + 1, c) + 1, get(r + 1, c + 1) + q, get(r + 1, c - 1) + q);
    }
    // the figures' text where it rests (the reveal may still be sliding it in)
    const texts = $$('.readout .facts__v, .readout dt, .readout__head', fam).map(el => {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      const r = rg.getBoundingClientRect(), tr = getComputedStyle(el).translate;
      const [tx = 0, ty = 0] = tr && tr !== 'none' ? tr.split(' ').map(parseFloat) : [];
      return [r.left - tx - 4, r.top - ty - 3, r.right - tx + 4, r.bottom - ty + 3];
    });
    const hitsRect = (ax, ay, bx, by, [l, t, r, b]) => { // Liang–Barsky
      let u0 = 0, u1 = 1;
      for (const [p, w] of [[ax - bx, ax - l], [bx - ax, r - ax], [ay - by, ay - t], [by - ay, b - ay]]) {
        if (!p) { if (w < 0) return false; continue; }
        const u = w / p;
        if (p < 0) { if (u > u1) return false; u0 = Math.max(u0, u); } else { if (u < u0) return false; u1 = Math.min(u1, u); }
      }
      return true;
    };
    const turn = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
    const crosses = (a, b, c, d) => turn(a, b, c) * turn(a, b, d) < 0 && turn(c, d, a) * turn(c, d, b) < 0;
    const maxTan = Math.tan((stacked ? 30 : 20) * Math.PI / 180), tilt = stacked ? 1.2 : 2.5;
    const done = [];
    leads.forEach((l, n) => {
      const right = fromRight(l), s = S[n];
      const [ux, uy] = stacked ? [0, 1] : [l.closest('.readout--r') ? -1 : 1, 0]; // main direction
      const cands = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (D[r * cols + c] * G < PIN) continue;
        const x = x0 + (c + 0.5) * G, y = y0 + (r + 0.5) * G, vx = x - s[0], vy = y - s[1];
        const along = vx * ux + vy * uy, across = Math.abs(vx * uy - vy * ux);
        if (along >= (stacked ? 16 : 28) && across <= along * maxTan) cands.push([Math.hypot(vx, vy) + tilt * across, x, y]);
      }
      cands.sort((p, q2) => p[0] - q2[0]);
      // off the foil (beyond its rim) until the last stretch before the pin
      const clear = (x, y) => {
        const len = Math.hypot(x - s[0], y - s[1]);
        for (let d = 0; d < len - PIN - 6; d += G) {
          const c = (s[0] + (x - s[0]) * d / len - x0) / G | 0, r = (s[1] + (y - s[1]) * d / len - y0) / G | 0;
          if (get(r, c) * G > PIN - 2) return false;
        }
        return true;
      };
      const pick = cands.find(([, x, y]) => !texts.some(t => hitsRect(s[0], s[1], x, y, t)) &&
        done.every(d => Math.hypot(d[2] - x, d[3] - y) > 30 && !crosses(d, d.slice(2), s, [x, y])) && clear(x, y));
      if (!pick) { l.classList.remove('is-fit'); l.style.removeProperty('--len'); l.style.removeProperty('--ang'); return; }
      const [, x, y] = pick, vx = x - s[0], vy = y - s[1];
      done.push([s[0], s[1], x, y]);
      // drawn along +x from its origin (along -x when it hangs from the right), then turned onto the pin
      l.style.setProperty('--len', (Math.hypot(vx, vy) + 4.5).toFixed(1) + 'px');
      l.style.setProperty('--ang', ((right ? Math.atan2(-vy, -vx) : Math.atan2(vy, vx)) * 180 / Math.PI).toFixed(2) + 'deg');
      l.classList.add('is-fit');
    });
  }
  const fitWanted = new Set();
  let fitFrame = 0;
  function queueFit(fam, delay = 0) {
    if (!fam._near) return;
    clearTimeout(fam._fitT);
    fam._fitT = setTimeout(() => {
      fitWanted.add(fam);
      if (!fitFrame) fitFrame = requestAnimationFrame(nextFit);
    }, delay);
  }
  function nextFit() { // one family per frame, so no single task grows long
    const fam = fitWanted.values().next().value;
    fitWanted.delete(fam);
    fitCallouts(fam);
    fitFrame = fitWanted.size ? requestAnimationFrame(nextFit) : 0;
  }
  families.forEach(fam => {
    $$('.pack img', fam).forEach(img => img.addEventListener('load', () => queueFit(fam, 30)));
    fam.addEventListener('range:change', () => queueFit(fam, motionOK() ? 760 : 30)); // once the packs have re-staged
  });
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target._near = true; near.unobserve(en.target); queueFit(en.target); }
    }), { rootMargin: '60% 0px' });
    families.forEach(f => near.observe(f));
  } else families.forEach(f => { f._near = true; queueFit(f); });
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(entries => entries.forEach(en => queueFit(en.target.closest('.family'), 90)));
    families.forEach(f => [$('.family__compose', f), ...$$('.readout', f)].forEach(el => ro.observe(el)));
  }
  document.fonts.ready.then(() => families.forEach(f => queueFit(f)));

  /* ------------------------------------------------------------ intent pre-selection */
  const intents = $$('input[name="intent"]');
  $$('[data-intent]').forEach(a => a.addEventListener('click', () => {
    const r = intents.find(i => i.value === a.dataset.intent) || intents.find(i => i.value === 'Consumer');
    if (r) r.checked = true;
  }));

  /* ------------------------------------------------------------ form */
  const form = $('#contact');
  const submit = $('.form__submit', form);
  const status = $('.form__status', form);
  const key = form.elements.access_key.value.trim();
  const configured = key !== '' && key !== 'WEB3FORMS_ACCESS_KEY';
  submit.disabled = false;
  const hint = $('[data-form-hint]', form);
  if (configured && hint) hint.hidden = true;
  // Email fallback: used until the Web3Forms key is in, and whenever online sending fails.
  const inbox = (form.dataset.fallbackEmail || '').trim();
  const fallback = $('.form__fallback', form);
  const fallbackLink = $('[data-fallback-mailto]', form);
  const copyBtn = $('[data-copy-brief]', form);
  let lastBrief = '';
  const briefText = (data, fams) => ['YOUNITED — Enquiry', '',
    'I’m here as a: ' + (data.get('intent') || ''),
    'Name: ' + (data.get('name') || ''),
    'Email: ' + (data.get('email') || ''),
    'Company: ' + (data.get('company') || '—'),
    'Country / market: ' + (data.get('country') || '—'),
    'Families: ' + (fams.length ? fams.join(', ') : '—'),
    '', 'Message:', String(data.get('message') || ''), '',
    'Sent from younitedsnacks.com'].join('\n');
  const mailtoFor = (data, fams) => {
    let body = briefText(data, fams);
    if (body.length > 1800) body = body.slice(0, 1800) + '…\n\n(Shortened: please paste the rest of your message here.)';
    return 'mailto:' + inbox + '?subject=' + encodeURIComponent('YOUNITED enquiry: ' + (data.get('intent') || '')) + '&body=' + encodeURIComponent(body);
  };
  function offerEmail(data, fams) {
    if (!inbox || !fallback) return;
    lastBrief = briefText(data, fams);
    fallbackLink.href = mailtoFor(data, fams);
    if (!(navigator.clipboard && window.isSecureContext)) copyBtn.hidden = true;
    fallback.hidden = false;
  }
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(lastBrief);
      copyBtn.textContent = 'Copied';
      setTimeout(() => { copyBtn.textContent = 'Copy my enquiry'; }, 2200);
    } catch (err) { copyBtn.hidden = true; }
  });
  const checks = [
    ['f-name', 'e-name'], ['f-email', 'e-email'], ['f-msg', 'e-msg'], ['f-consent', 'e-consent'],
  ].map(([f, e]) => ({ field: $('#' + f), error: $('#' + e) }));
  let tried = false;
  function validate() {
    let firstBad = null;
    checks.forEach(({ field, error }) => {
      const ok = field.checkValidity();
      if (ok) field.removeAttribute('aria-invalid'); else field.setAttribute('aria-invalid', 'true');
      error.hidden = ok;
      if (ok) field.removeAttribute('aria-describedby'); else field.setAttribute('aria-describedby', error.id);
      if (!ok && !firstBad) firstBad = field;
    });
    return firstBad;
  }
  form.addEventListener('input', () => { if (tried) validate(); });
  form.addEventListener('change', () => { if (tried) validate(); });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    tried = true;
    status.className = 'form__status';
    const bad = validate();
    if (bad) {
      status.textContent = 'Please check the highlighted fields.';
      status.classList.add('is-error');
      bad.focus();
      return;
    }
    if (form.elements.botcheck.checked) return;
    const data = new FormData(form);
    const fams = data.getAll('families');
    if (!configured) {
      offerEmail(data, fams);
      status.textContent = 'Your email app should now open with your enquiry. Nothing opened? Copy it and email ' + inbox + '.';
      status.classList.add('is-ok');
      location.href = mailtoFor(data, fams);
      return;
    }
    const payload = {};
    data.forEach((v, k) => { if (k !== 'families') payload[k] = v; });
    payload.families = fams.join(', ');
    submit.disabled = true;
    if (fallback) fallback.hidden = true;
    status.textContent = 'Sending your enquiry…';
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.success) throw new Error('failed');
      status.textContent = 'Thank you. Your enquiry has been sent.';
      status.classList.add('is-ok');
      form.reset(); tried = false;
    } catch (err) {
      status.textContent = 'Your enquiry could not be sent. Your details are still here: try again, or email it to us instead.';
      status.classList.add('is-error');
      offerEmail(data, fams);
    } finally {
      submit.disabled = false;
    }
  });

  /* ------------------------------------------------------------ scroll reveals */
  // Manifesto lines slide up from a mask: wrap each line's text once.
  $$('.manifesto__title .ln').forEach(ln => {
    const inner = document.createElement('span');
    while (ln.firstChild) inner.append(ln.firstChild);
    ln.append(inner);
  });
  function onReveal(el) {
    if (el.classList.contains('stage')) {
      const front = $('.pack[data-slot="0"]', el);
      sheen(front, 950);
    } else if (el.classList.contains('manifesto')) {
      setTimeout(() => el.classList.add('is-done'), motionOK() ? 1400 : 0); // drop the line masks once settled
    } else if (el.classList.contains('spotlight')) {
      sheen($('.spotlight__tilt', el), 1100);
    } else if (el.classList.contains('family__compose')) {
      el.closest('.family').classList.add('is-in'); // figures slide in beside the packs, leaders draw towards them
    }
  }
  const revealTargets = $$('.stage, .family__compose, .manifesto, .spotlight');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); onReveal(en.target); }
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('is-in', 'is-done'));
    families.forEach(f => f.classList.add('is-in'));
  }
  addEventListener('beforeprint', () => { revealTargets.forEach(el => el.classList.add('is-in', 'is-done')); families.forEach(f => f.classList.add('is-in')); });

  /* ------------------------------------------------------------ ingredient ribbon */
  const ribbon = $('.ribbon');
  const track = $('.ribbon__track', ribbon);
  function setRibbon() {
    $$('.ribbon__set[aria-hidden]', track).forEach(n => n.remove());
    ribbon.classList.remove('is-moving');
    if (!motionOK()) return;
    const set = $('.ribbon__set', track);
    for (let i = 0; i < 3; i++) {
      const c = set.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      track.append(c);
    }
    ribbon.classList.add('is-moving');
  }
  setRibbon();
  reduceMQ.addEventListener('change', setRibbon);

  /* ------------------------------------------------------------ sticky family index: current family + progress */
  const indexLinks = $$('.ri');
  function updateIndex() {
    if (!indexLinks.length) return;
    const top = headH() + rangeIndex.offsetHeight;
    const probe = top + (innerHeight - top) * 0.3; // a family is "current" while it crosses this line
    indexLinks.forEach(link => {
      const r = $('#family-' + link.dataset.showFamily).getBoundingClientRect();
      const current = r.top <= probe && r.bottom > probe;
      const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (r.height + innerHeight - top)));
      link.style.setProperty('--p', current ? Math.max(p, 0.05).toFixed(3) : '0');
      if (current) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
    });
  }

  /* ------------------------------------------------------------ sticky CTA (≤820px)
     Shown past the hero; hidden over a family's figures and over its flavour pick, near the form and while the menu is open.
     Hysteresis: it hides at once, but shows only after the "show" condition has held for 260ms, and a facts label must
     be well clear (72px) before it comes back, so it never blinks while you scroll. */
  const sticky = $('.sticky-cta');
  const hero = $('#hero');
  const partner = $('#partner');
  const darkSel = '.manifesto, .spotlight, .sheet, .field--cereal, .family--cereal .family__field';
  let shown = false, showTimer = null;
  function setShown(v) {
    shown = v;
    sticky.classList.toggle('is-shown', v);
    if (v) {
      const r = sticky.getBoundingClientRect();
      const under = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find(el => !sticky.contains(el));
      sticky.classList.toggle('on-dark', !!(under && under.closest(darkSel)));
    }
  }
  function wantSticky() {
    if (!mobileMQ.matches || head.classList.contains('is-open')) return false;
    if (hero.getBoundingClientRect().bottom > 40) return false;
    if (partner.getBoundingClientRect().top < innerHeight) return false;
    const r = sticky.getBoundingClientRect();
    const top = innerHeight - 12 - r.height, bottom = innerHeight - 12; // where it sits when shown
    const margin = shown ? 12 : 72;
    // two zones per family: its figures, and its shelf-edge label (flavour, pills, footnote, link); never covered
    for (const fam of families) {
      const ro = $$('.readout', fam).map(el => el.getBoundingClientRect());
      const label = $('.family__label', fam).getBoundingClientRect();
      const zones = [[Math.min(...ro.map(r => r.top)), Math.max(...ro.map(r => r.bottom))], [label.top, label.bottom]];
      for (const [t, b] of zones) if (b > top - margin && t < bottom + margin) return false;
    }
    return true;
  }
  function updateSticky() {
    const past = hero.getBoundingClientRect().bottom < 40;
    head.classList.toggle('is-past', past && mobileMQ.matches);
    const want = wantSticky();
    if (!want) { clearTimeout(showTimer); showTimer = null; if (shown) setShown(false); return; }
    if (shown) { setShown(true); return; } // refresh the light/dark variant
    if (!showTimer) showTimer = setTimeout(() => { showTimer = null; if (wantSticky()) setShown(true); }, 260);
  }

  /* ------------------------------------------------------------ keep the reader's place across resize and rotation */
  const anchorables = $$('main > section, .family, .ribbon, footer');
  let anchor = null;
  function captureAnchor() {
    const hh = headH();
    let best = null;
    for (const el of anchorables) {
      const r = el.getBoundingClientRect();
      if (r.top <= hh + 1 && r.bottom > hh + 1 && (!best || el.contains(best.el) || r.height < best.h)) best = { el, h: r.height, ratio: (hh - r.top) / r.height };
    }
    anchor = scrollY < 4 ? null : best;
  }
  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; updateSticky(); updateIndex(); captureAnchor(); }); } };
  addEventListener('scroll', onScroll, { passive: true });
  let lastW = innerWidth;
  addEventListener('resize', () => {
    if (anchor && innerWidth !== lastW) {
      const hh = headH();
      const r = anchor.el.getBoundingClientRect();
      scrollTo({ top: scrollY + r.top - hh + anchor.ratio * r.height, behavior: 'instant' });
    }
    lastW = innerWidth;
    onScroll();
  });
  requestAnimationFrame(() => { updateSticky(); updateIndex(); });
  // An address with a fragment (#family-puffs, a shared link) must land on it even when the browser's own load-time jump
  // is lost (seen now and then in Chromium when the page opens in a tab that just showed another page).
  addEventListener('load', () => requestAnimationFrame(() => {
    let target = null;
    try { target = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (err) { target = null; }
    if (target && scrollY < 4 && target.getBoundingClientRect().top > innerHeight * 0.5) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  }));
})();
