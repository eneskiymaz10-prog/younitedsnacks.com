(() => {
  'use strict';
  const range = document.querySelector('#range');
  const panels = [...range.querySelectorAll('[data-family]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // The small-screen selector works without the animation library.
  range.addEventListener('range:change', ({ detail }) => {
    if (reduced.matches) return;
    const panel = panels.find(item => item.dataset.family === detail.id);
    panel.querySelectorAll('.product-stage, .family__copy').forEach((item, index) => {
      item.getAnimations().forEach(animation => animation.cancel());
      item.animate([{ transform: `translateX(${index ? 18 : -24}px)` }, { transform: 'translateX(0)' }],
        { duration: 500, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  });
  if (!window.gsap || !window.ScrollTrigger) return;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const packs = [...document.querySelectorAll('.hero__pack')];
    const layers = packs.map(pack => {
      const layer = document.createElement('div');
      layer.className = 'motion-pack-layer';
      layer.style.zIndex = getComputedStyle(pack).zIndex;
      pack.before(layer);
      layer.append(pack);
      return layer;
    });
    if (window.scrollY < 120) {
      const entrance = gsap.timeline({ defaults: { ease: 'power4.out' } });
      entrance.from('.headline-line > span', { yPercent: 115, duration: 1.05, stagger: .12, clearProps: 'transform' }, .08)
        .from(packs, { y: 100, x: index => [55, 95, -90][index], rotation: index => [-24, 25, -28][index], duration: 1.5, stagger: .12, clearProps: 'transform' }, .15)
        .from('.hero__seal', { y: -35, rotation: -10, duration: .9, clearProps: 'transform' }, .65);
    }
    layers.forEach((layer, index) => {
      gsap.to(layer, { y: [55, -45, -70][index], rotation: [3, -3, 2][index], ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: .8 } });
    });
    gsap.from('.intro h2', { x: -35, duration: .9, ease: 'power3.out', clearProps: 'transform',
      scrollTrigger: { trigger: '.intro', start: 'top 75%', once: true } });
    gsap.fromTo('.feature__pack', { y: 45, rotation: -17 }, { y: -35, rotation: -7, ease: 'none',
      scrollTrigger: { trigger: '.feature', start: 'top bottom', end: 'bottom top', scrub: .8 } });
    gsap.from('.production-line__route', { scaleX: 0, duration: 1.15, ease: 'power3.inOut', clearProps: 'transform',
      scrollTrigger: { trigger: '.production-line', start: 'top 80%', once: true } });
    return () => layers.forEach(layer => layer.replaceWith(...layer.childNodes));
  });

  media.add('(min-width: 1001px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)', () => {
    const experience = range.querySelector('.range-experience');
    const track = range.querySelector('.range-panels');
    const tabs = [...range.querySelectorAll('[data-show-family]')];
    range.classList.add('range-cinematic');
    range.dispatchEvent(new CustomEvent('range:layout', { detail: { cinematic: true } }));
    let active = '';
    const syncFamily = self => {
      const position = self.progress * (panels.length - 1);
      const index = Math.round(position);
      const id = panels[index].dataset.family;
      panels.forEach((panel, i) => { panel.inert = i !== index; });
      if (id !== active) {
        active = id;
        range.dispatchEvent(new CustomEvent('range:active', { detail: { id } }));
      }
      tabs[index].style.setProperty('--chapter-progress', String(Math.min(1, Math.max(.08, position - index + .5))));
    };
    const journey = gsap.to(track, {
      x: () => -(panels.length - 1) * experience.clientWidth,
      ease: 'none',
      scrollTrigger: {
        trigger: experience, start: 'top top', end: () => '+=' + (panels.length - 1) * experience.clientWidth,
        pin: true, scrub: .65, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: syncFamily, onRefresh: syncFamily
      }
    });
    panels.forEach((panel, index) => {
      if (index === 0) return;
      gsap.fromTo(panel.querySelector('.product-stage'), { x: 75 }, { x: 0, ease: 'none',
        scrollTrigger: { trigger: panel, containerAnimation: journey, start: 'left right', end: 'left left', scrub: true } });
    });
    const choose = ({ detail }) => {
      const index = panels.findIndex(panel => panel.dataset.family === detail.id);
      if (index < 0) return;
      const trigger = journey.scrollTrigger;
      window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * index / (panels.length - 1), behavior: 'smooth' });
    };
    range.addEventListener('range:select', choose);
    return () => {
      range.removeEventListener('range:select', choose);
      range.classList.remove('range-cinematic');
      panels.forEach(panel => { panel.inert = false; });
      tabs.forEach(tab => tab.style.removeProperty('--chapter-progress'));
      range.dispatchEvent(new CustomEvent('range:layout', { detail: { cinematic: false } }));
    };
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
})();
