import { initParticleTitle } from './particle-title';
import { lightsOut } from './lights-out';

export function initPageMotion() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const progress = document.querySelector<HTMLElement>('[data-progress]');
  const panels = [...document.querySelectorAll<HTMLElement>('.snap-panel')];
  const railItems = [...document.querySelectorAll<HTMLAnchorElement>('[data-rail] a')];
  const story = document.querySelector<HTMLElement>('[data-story]');
  const proseParts = story ? [...story.querySelectorAll<HTMLElement>('.prose > *')] : [];
  const storySteps = story ? [...story.querySelectorAll<HTMLElement>('[data-story-step]')] : [];
  let active: HTMLElement | undefined;
  let queued = false;

  // `fx` is set in <head> only when motion is allowed; if the particles can't start, show the plain heading.
  const hero = document.querySelector<HTMLElement>('.hero');
  const title = hero?.querySelector<HTMLElement>('h1');
  if (hero && title && root.classList.contains('fx')) {
    try { initParticleTitle(hero, title, document.querySelector<HTMLElement>('.work h3')).catch(() => root.classList.remove('fx')); } catch { root.classList.remove('fx'); }
  }

  // Each panel's content rises in again whenever it becomes the one in view.
  function stagger(panel: HTMLElement) {
    panel.querySelectorAll<HTMLElement>('[data-stagger] > *').forEach((el, n) => el.animate(
      [{ opacity: 0, transform: 'translateY(28px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'none' }],
      { duration: 800, delay: 80 + n * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
  }

  function updateScroll() {
    queued = false;
    const max = root.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0})`;
    if (story) updateStory(story);
    const mid = innerHeight / 2;
    const next = panels.find(el => { const r = el.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
    if (next === active) return;
    active = next;
    root.style.setProperty('--scroll-accent', next?.dataset.accent ?? '#7dabff');
    for (const a of railItems) {
      const on = !!next && a.hash === `#${next.id}`;
      a.setAttribute('aria-current', String(on));
      a.classList.remove('is-flash');
      if (on && !reduce.matches) { void a.offsetWidth; a.classList.add('is-flash'); } // restart the label flash
    }
    if (next && !reduce.matches) stagger(next);
    document.dispatchEvent(new CustomEvent('beep:panel', { detail: next?.id ?? '' }));
    if (next?.dataset.work === 'lamplighter' && !reduce.matches && !lampsDone) { lampsDone = true; relight = lightsOut(next); }
    else if (next?.dataset.work !== 'lamplighter') { relight?.(); relight = undefined; }
  }

  // Lamplighter's lamps get lit once per page load; after that they stay lit on the card.
  let relight: (() => void) | undefined, lampsDone = false;
  // Detail pages: the chapter whose heading has passed 60% of the screen is the current one; it drives
  // the pinned artwork (data-step) and brightens its own paragraphs (text before the first heading stays lit).
  let chapter = -1;
  for (const part of proseParts) { if (part.tagName === 'H2') chapter++; part.dataset.chapter = String(chapter); }
  const headings = proseParts.filter(p => p.tagName === 'H2');
  function updateStory(el: HTMLElement) {
    const step = String(Math.max(0, headings.filter(h => h.getBoundingClientRect().top < innerHeight * .6).length - 1));
    if (el.dataset.step === step && el.dataset.ready) return;
    el.dataset.step = step;
    el.dataset.ready = '1';
    for (const part of proseParts) part.classList.toggle('is-current', part.dataset.chapter === step || part.dataset.chapter === '-1');
    storySteps.forEach((li, i) => li.classList.toggle('is-current', String(i) === step));
  }

  function queueScroll() {
    if (!queued) { queued = true; requestAnimationFrame(updateScroll); }
  }
  addEventListener('scroll', queueScroll, { passive: true });
  addEventListener('resize', queueScroll);
  updateScroll();

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-squish]')) {
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;
    const press = () => { clearTimeout(releaseTimer); button.classList.add('is-pressed'); };
    const release = () => { releaseTimer = setTimeout(() => button.classList.remove('is-pressed'), 100); };
    button.addEventListener('pointerdown', e => { if (e.button === 0) { button.setPointerCapture(e.pointerId); press(); navigator.vibrate?.(8); } });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) button.addEventListener(name, release);
    button.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); } });
    button.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') release(); });
    button.addEventListener('click', e => { if (e.detail === 0) { press(); release(); } });
  }

  if (reduce.matches) return;

  // Artwork: --gx/--gy follow the pointer (glare, lamp light); a mouse also tilts the card.
  // A tap leaves the light where the finger was for a moment before it drifts home.
  for (const el of document.querySelectorAll<HTMLElement>('[data-tilt]')) {
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    const move = (e: PointerEvent) => {
      clearTimeout(resetTimer);
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--gx', `${x * 100}%`);
      el.style.setProperty('--gy', `${y * 100}%`);
      el.classList.add('is-lit');
      if (e.pointerType === 'mouse') { el.style.setProperty('--ry', `${(x - .5) * 12}deg`); el.style.setProperty('--rx', `${(.5 - y) * 9}deg`); }
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', move);
    el.addEventListener('pointerleave', e => {
      resetTimer = setTimeout(() => {
        el.classList.remove('is-lit');
        for (const p of ['--gx', '--gy', '--rx', '--ry']) el.style.removeProperty(p);
      }, e.pointerType === 'mouse' ? 0 : 1400);
    });
  }

  for (const el of document.querySelectorAll<HTMLElement>('[data-magnet]')) {
    el.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      el.style.translate = `${(e.clientX - r.left - r.width / 2) * .3}px ${(e.clientY - r.top - r.height / 2) * .4}px`;
    });
    el.addEventListener('pointerleave', () => { el.style.translate = ''; });
  }
}
