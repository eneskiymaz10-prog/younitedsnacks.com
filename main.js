/* ───────────────────────── YOUNITED — main.js ───────────────────────── */
(function () {
  const html = document.documentElement;
  html.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- nav ---------- */
  const nav = document.querySelector('.nav');
  const burger = nav.querySelector('.nav__burger');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open);
  });
  nav.querySelectorAll('.nav__links a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }));

  /* ---------- intent from CTA ---------- */
  document.querySelectorAll('[data-intent]').forEach(a => a.addEventListener('click', () => {
    const r = document.querySelector(`.segments input[value="${a.dataset.intent}"]`) || document.querySelector('.segments input[value="Consumer"]');
    if (r) r.checked = true;
  }));

  /* ---------- form ---------- */
  const form = document.getElementById('contact');
  const status = form.querySelector('.form__status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const btn = form.querySelector('button[type=submit]');
    const key = form.access_key.value;
    if (!key || key === 'WEB3FORMS_ACCESS_KEY') {
      const fd = new FormData(form);
      const body = encodeURIComponent(`Intent: ${fd.get('intent')}\nName: ${fd.get('name')}\nCompany: ${fd.get('company') || '-'}\nCountry: ${fd.get('country') || '-'}\n\n${fd.get('message') || ''}`);
      location.href = `mailto:hello@younitedsnacks.com?subject=${encodeURIComponent('Enquiry via younitedsnacks.com')}&body=${body}`;
      status.textContent = 'Opening your email app…';
      return;
    }
    btn.disabled = true; status.textContent = 'Sending…';
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      const json = await res.json();
      if (res.ok && json.success) { form.classList.add('is-sent'); status.textContent = 'Thank you. We reply within 48 hours — the line sheet is on its way.'; }
      else { status.textContent = json.message || 'Something went wrong. Email hello@younitedsnacks.com.'; btn.disabled = false; }
    } catch { status.textContent = 'Network error. Email hello@younitedsnacks.com.'; btn.disabled = false; }
  });

  /* ---------- map background (dot grid + graticule), built with DOM APIs ---------- */
  const land = document.querySelector('.map__land');
  if (land) {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
    land.appendChild(el('rect', { width: 1000, height: 520, fill: 'url(#dots)' }));
    [80, 160, 260, 360, 440].forEach(y => land.appendChild(el('line', { x1: 0, y1: y, x2: 1000, y2: y, stroke: 'currentColor', 'stroke-opacity': .08 })));
    [125, 250, 375, 500, 625, 750, 875].forEach(x => land.appendChild(el('line', { x1: x, y1: 0, x2: x, y2: 520, stroke: 'currentColor', 'stroke-opacity': .08 })));
    ['M150 210 C 200 150, 320 120, 380 170 S 470 260, 420 320 S 300 360, 250 300 S 120 280, 150 210 Z',
     'M470 140 C 560 100, 700 110, 780 150 S 900 200, 860 260 S 720 330, 640 300 S 500 320, 470 240 Z',
     'M540 300 C 600 280, 660 300, 680 350 S 640 430, 600 440 S 520 400, 540 300 Z'
    ].forEach(d => land.appendChild(el('path', { d, fill: 'currentColor', 'fill-opacity': .05 })));
  }

  /* ---------- manifesto: wrap words in spans (text only, DOM built) ---------- */
  const man = document.querySelector('[data-words]');
  if (man) {
    const frag = document.createDocumentFragment();
    const walk = (node, target) => {
      node.childNodes.forEach(child => {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach(tok => {
            if (/\S/.test(tok)) { const s = document.createElement('span'); s.className = 'w'; s.textContent = tok; target.appendChild(s); }
            else if (tok) target.appendChild(document.createTextNode(tok));
          });
        } else if (child.nodeType === 1) {
          const c = document.createElement(child.tagName.toLowerCase()); walk(child, c); target.appendChild(c);
        }
      });
    };
    walk(man, frag);
    man.replaceChildren(frag);
  }

  /* ---------- no GSAP / reduced motion: show everything ---------- */
  const showAll = () => {
    document.querySelectorAll('[data-reveal], .float').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    document.querySelectorAll('.bar__fill').forEach(b => b.style.width = b.dataset.w + '%');
    document.querySelectorAll('[data-count]').forEach(el => el.textContent = el.dataset.count);
    document.querySelectorAll('.manifesto__text .w').forEach(w => w.classList.add('is-on'));
    const l = document.querySelector('.loader'); if (l) l.remove();
  };
  if (!hasGsap || reduce) { showAll(); return; }

  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href'); if (id.length < 2) return;
      const target = document.querySelector(id); if (!target) return;
      e.preventDefault(); lenis.scrollTo(target, { offset: -70, duration: 1.4 });
    }));
  }

  /* ---------- cursor + magnetic ---------- */
  if (fine) {
    const c = document.querySelector('.cursor');
    const cx = gsap.quickTo(c, 'x', { duration: .22, ease: 'power3' });
    const cy = gsap.quickTo(c, 'y', { duration: .22, ease: 'power3' });
    window.addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); gsap.to(c, { opacity: 1, duration: .3 }); }, { passive: true });
    document.querySelectorAll('a, button, label').forEach(el => {
      el.addEventListener('pointerenter', () => gsap.to(c, { scale: 3.2, duration: .3 }));
      el.addEventListener('pointerleave', () => gsap.to(c, { scale: 1, duration: .3 }));
    });
    document.querySelectorAll('.magnetic').forEach(btn => {
      const xTo = gsap.quickTo(btn, 'x', { duration: .6, ease: 'power3' });
      const yTo = gsap.quickTo(btn, 'y', { duration: .6, ease: 'power3' });
      btn.addEventListener('pointermove', e => { const r = btn.getBoundingClientRect(); xTo((e.clientX - (r.left + r.width / 2)) * .3); yTo((e.clientY - (r.top + r.height / 2)) * .3); });
      btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- helpers ---------- */
  const countUp = (el) => {
    const end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10);
    const o = { v: 0 };
    return gsap.to(o, { v: end, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = o.v.toFixed(dec); } });
  };

  /* ---------- build after fonts ---------- */
  document.fonts.ready.then(() => {
    /* split headings (non-hero) */
    document.querySelectorAll('[data-split]').forEach(el => {
      const inHero = !!el.closest('.hero');
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
        onSplit: (self) => inHero ? null : gsap.from(self.lines, {
          yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: .09,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        })
      });
    });

    /* hero opener timeline */
    const loader = document.querySelector('.loader');
    const heroLines = document.querySelectorAll('.hero__title .line');
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.loader__logo', { opacity: 1, y: 0, duration: .9 })
      .to('.loader__stats', { opacity: 1, duration: .5 }, '-=.4')
      .to(loader, { yPercent: -100, duration: 1, ease: 'expo.inOut', delay: .35, onComplete: () => loader.remove() })
      .from(heroLines, { yPercent: 105, duration: 1.2, stagger: .1 }, '-=.55')
      .to('.hero [data-reveal]', { opacity: 1, y: 0, duration: 1, stagger: .12 }, '-=.9')
      .fromTo('.float', { opacity: 0, y: 80, scale: .92 }, { opacity: 1, y: 0, scale: 1, duration: 1.5, stagger: .08, ease: 'expo.out',
          onStart: () => document.querySelectorAll('.stat__num').forEach(countUp) }, '-=1');

    /* hero mouse parallax + scroll drift */
    const floats = document.querySelectorAll('.float');
    if (fine) {
      const movers = [...floats].map(f => ({ x: gsap.quickTo(f, 'x', { duration: 1.2, ease: 'power3' }), y: gsap.quickTo(f, 'y', { duration: 1.2, ease: 'power3' }), d: parseFloat(f.dataset.depth) }));
      window.addEventListener('pointermove', e => {
        const nx = (e.clientX / innerWidth - .5), ny = (e.clientY / innerHeight - .5);
        movers.forEach(m => { m.x(nx * 400 * m.d); m.y(ny * 300 * m.d); });
      }, { passive: true });
    }
    floats.forEach(f => gsap.to(f, { yPercent: -180 * parseFloat(f.dataset.depth), ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } }));
    gsap.to('.hero__ring', { rotate: 90, scale: 1.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    /* generic reveals (outside hero) */
    gsap.utils.toArray('[data-reveal]').filter(el => !el.closest('.hero')).forEach(el => {
      gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    /* manifesto word-by-word */
    if (man) {
      const words = man.querySelectorAll('.w');
      ScrollTrigger.create({ trigger: man, start: 'top 75%', end: 'bottom 45%', scrub: .4,
        onUpdate: s => { const n = Math.round(s.progress * words.length); words.forEach((w, i) => w.classList.toggle('is-on', i < n)); } });
    }

    /* range: horizontal pin on desktop */
    const mm = gsap.matchMedia();
    mm.add('(min-width: 821px)', () => {
      const track = document.querySelector('.range__track');
      const pin = document.querySelector('.range__pin');
      const dist = () => track.scrollWidth - innerWidth;
      const tween = gsap.to(track, { x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true } });
      document.querySelectorAll('.family').forEach(fam => {
        const imgs = fam.querySelectorAll('.family__art img');
        gsap.from(imgs, { xPercent: 30, yPercent: 20, opacity: 0, stagger: .1, ease: 'power3.out',
          scrollTrigger: { trigger: fam, containerAnimation: tween, start: 'left 80%', end: 'left 30%', scrub: true } });
        gsap.from(fam.querySelector('.family__copy'), { x: 60, opacity: 0, ease: 'power2.out',
          scrollTrigger: { trigger: fam, containerAnimation: tween, start: 'left 70%', end: 'left 30%', scrub: true } });
      });
      return () => {};
    });
    mm.add('(max-width: 820px)', () => {
      document.querySelectorAll('.family').forEach(fam => {
        gsap.from(fam.querySelectorAll('.family__art img'), { y: 60, opacity: 0, stagger: .1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: fam, start: 'top 75%', once: true } });
      });
    });

    /* nav state: light sections */
    ScrollTrigger.create({ start: 40, onUpdate: s => nav.classList.toggle('is-scrolled', s.scroll() > 40) });
    document.querySelectorAll('.manifesto, .range, .made, .founders').forEach(sec => {
      ScrollTrigger.create({ trigger: sec, start: 'top 60px', end: 'bottom 60px', onToggle: s => nav.classList.toggle('on-light', s.isActive) });
    });

    /* math bars */
    const bars = document.querySelector('[data-bars]');
    if (bars) ScrollTrigger.create({ trigger: bars, start: 'top 80%', once: true, onEnter: () => {
      gsap.to('.bar__fill', { width: (i, el) => el.dataset.w + '%', duration: 1.6, ease: 'expo.out', stagger: .12 });
      bars.querySelectorAll('[data-count]').forEach(countUp);
    } });

    /* proof numbers */
    document.querySelectorAll('.proof [data-count]').forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => countUp(el) }));

    /* map clip reveal */
    const map = document.querySelector('.map');
    if (map) gsap.from(map, { clipPath: 'inset(12% round 24px)', scale: 1.06, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: map, start: 'top 80%', once: true } });

    /* sticky mobile CTA */
    const sticky = document.querySelector('.sticky-cta');
    if (sticky) ScrollTrigger.create({ trigger: '#hero', start: 'bottom 60%', endTrigger: '#partner', end: 'top 80%', onToggle: s => sticky.classList.toggle('is-visible', s.isActive) });

    ScrollTrigger.refresh();
  });
})();
