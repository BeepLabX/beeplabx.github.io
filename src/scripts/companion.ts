import type { Errand } from './lights-out';

const KEY = 'totillu-walk';
const POS = 'totillu-pos';

/**
 * Totillu wanders anywhere between the header and the footer bar, hopping while it walks and facing
 * where it goes. Pointing at it or focusing it makes it stop; dragging it drops it somewhere new.
 * The footer toggle pauses the walk (remembered per browser); reduced motion starts it paused.
 * It reacts to the page: sits on the card of the project in view, carries a lantern in Lamplighter's (and lights its lamps once),
 * jumps at the hero's particle burst, squishes along with the big Totillu, and keeps its spot across pages.
 */
export function initCompanion() {
  const pet = document.querySelector<HTMLElement>('[data-companion]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-companion-toggle]');
  if (!pet || !toggle) return;
  const friend = pet.querySelector<HTMLButtonElement>('button')!;
  const label = toggle.querySelector<HTMLElement>('[data-companion-label]')!;
  const say = pet.querySelector<HTMLElement>('[data-companion-say]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector<HTMLElement>('.header');
  const footer = document.querySelector<HTMLElement>('.footer');
  let stored: string | null = null;
  try { stored = localStorage.getItem(KEY); } catch { /* storage blocked: use the default */ }
  let paused = stored ? stored === 'paused' : reduce.matches;
  let interacting = false;
  let x = 0, y = 0, tx = 0, ty = 0, frame = 0, last = 0, restUntil = 0, time = 0;
  let linger = false;
  let errand: Errand | null = null;
  let drag: { id: number; dx: number; dy: number; sx: number; sy: number; moved: boolean } | null = null;

  const bounds = () => {
    const top = (header?.offsetHeight ?? 0) + 36; // room for the speech bubble
    const bottom = innerHeight - (footer?.offsetHeight ?? 0) - pet.offsetHeight - 4;
    return { minX: 4, maxX: Math.max(4, innerWidth - pet.offsetWidth - 4), minY: top, maxY: Math.max(top, bottom) };
  };
  const fit = (px: number, py: number) => {
    const b = bounds();
    return [Math.min(b.maxX, Math.max(b.minX, px)), Math.min(b.maxY, Math.max(b.minY, py))];
  };
  const clamp = () => { [x, y] = fit(x, y); };
  const paint = (hop = 0) => { pet.style.transform = `translate(${x}px, ${y - hop}px)`; };
  const pickTarget = () => {
    const b = bounds();
    tx = b.minX + Math.random() * (b.maxX - b.minX);
    ty = b.minY + Math.random() * (b.maxY - b.minY);
  };

  function tick(now: number) {
    frame = 0;
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016);
    last = now;
    time += dt;
    const dx = tx - x, dy = ty - y, distance = Math.hypot(dx, dy);
    if (now < restUntil) paint(Math.sin(time * 2) * 2);
    else if (distance < 2 && errand) {
      const job = errand;
      errand = null;
      restUntil = now + 220;
      react('점등!', [{ scale: '1 1' }, { scale: '1.2 .75', offset: .3 }, { scale: '1 1' }], 400);
      job.done(); // the next lamp's errand arrives right away
    }
    else if (distance < 2) { restUntil = now + (linger ? 7000 : 1500 + Math.random() * 3500); linger = false; pickTarget(); }
    else {
      const step = Math.min(1, (errand ? 900 : linger ? 280 : 70) * dt / distance); // hurries on errands and visits
      x += dx * step; y += dy * step;
      if (Math.abs(dx) > 2) pet!.style.setProperty('--face', dx < 0 ? '-1' : '1');
      paint(Math.abs(Math.sin(time * (errand || linger ? 12 : 6))) * 9);
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0; last = 0;
    toggle!.setAttribute('aria-pressed', String(paused));
    toggle!.setAttribute('aria-label', paused ? '토틸루 산책 시작하기' : '토틸루 산책 멈추기');
    label.textContent = paused ? '쉬는 중' : '산책 중';
    pet!.dataset.state = paused ? 'paused' : 'walking';
    if (!paused && !interacting && !drag && !document.hidden) frame = requestAnimationFrame(tick);
    else paint();
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem(KEY, paused ? 'paused' : 'walking'); } catch { /* not remembered */ }
    sync();
  });
  friend.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { interacting = true; sync(); } });
  friend.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { interacting = false; sync(); } });
  friend.addEventListener('focus', () => { interacting = true; sync(); });
  friend.addEventListener('blur', () => { interacting = false; sync(); });

  // Drag: a press that moves more than a few pixels picks Totillu up; a still press is just a squish.
  friend.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, dx: e.clientX - x, dy: e.clientY - y, sx: e.clientX, sy: e.clientY, moved: false };
    sync();
  });
  friend.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
    drag.moved = true;
    pet.classList.add('is-dragging');
    friend.classList.remove('is-pressed');
    x = e.clientX - drag.dx; y = e.clientY - drag.dy;
    clamp(); paint();
  });
  const drop = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    pet.classList.remove('is-dragging');
    if (!errand) { tx = x; ty = y; restUntil = performance.now() + 2500; } // on an errand it runs back to the lamp
    sync();
  };
  friend.addEventListener('pointerup', drop);
  friend.addEventListener('pointercancel', drop);
  friend.addEventListener('lostpointercapture', drop);

  // Sections: after the snap settles, walk over and sit on the top edge of that project's card.
  let visitTimer: ReturnType<typeof setTimeout> | undefined;
  let panelId = '';
  function visit(delay: number) {
    clearTimeout(visitTimer);
    const id = panelId, card = id && document.querySelector(`#${id} .project-art`);
    if (!card) return;
    visitTimer = setTimeout(() => {
      if (paused || drag || errand) return;
      const r = card.getBoundingClientRect();
      [tx, ty] = fit(id === 'project-lamplighter' ? r.right - pet!.offsetWidth - 12 : r.left + 12, r.top - pet!.offsetHeight * .82);
      restUntil = 0; linger = true;
    }, delay);
  }
  document.addEventListener('beep:panel', e => {
    panelId = (e as CustomEvent<string>).detail;
    pet.dataset.mood = panelId === 'project-lamplighter' ? 'lamp' : '';
    visit(700);
  });

  // Lamplighter's lights-out: run to the lamp and light it (only when free to walk).
  document.addEventListener('beep:errand', e => {
    if (paused || drag || interacting) return;
    const job = (e as CustomEvent<Errand>).detail;
    job.accept();
    errand = job;
    [tx, ty] = fit(job.x - pet.offsetWidth / 2, job.y - pet.offsetHeight * .85);
    restUntil = Math.min(restUntil, performance.now() + 220);
  });
  // Done lighting: climb up onto the card's top edge, off the lamps.
  document.addEventListener('beep:errand-end', () => { errand = null; visit(500); });

  let sayTimer: ReturnType<typeof setTimeout> | undefined;
  function react(text: string, frames: Keyframe[], duration: number) {
    if (!reduce.matches) friend.animate(frames, { duration, easing: 'cubic-bezier(.3,.7,.4,1)' });
    say.textContent = text;
    friend.classList.add('is-startled');
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => { friend.classList.remove('is-startled'); say.textContent = '안녕!'; }, 1100);
  }
  document.addEventListener('beep:burst', e => {
    const p = (e as CustomEvent<{ x: number; y: number }>).detail, r = pet.getBoundingClientRect();
    if (Math.hypot(p.x - r.left - r.width / 2, p.y - r.top - r.height / 2) < 420) react('깜짝!', [{ translate: '0 0' }, { translate: '0 -46px', offset: .4 }, { translate: '0 0' }], 600);
  });
  document.addEventListener('pointerdown', e => {
    if ((e.target as Element).closest('.art__touch')) react('나도!', [{ scale: '1 1' }, { scale: '1.15 .8', offset: .3 }, { scale: '1 1' }], 450);
  });

  document.addEventListener('visibilitychange', sync);
  addEventListener('resize', () => { clamp(); tx = x; ty = y; paint(); });

  // Start where Totillu stood on the previous page (it stays put through the page transition),
  // otherwise in the lower-right corner just above the footer toggle.
  const b = bounds();
  let saved: { x: number; y: number } | null = null;
  try { saved = JSON.parse(sessionStorage.getItem(POS) ?? 'null'); } catch { /* start in the corner */ }
  [x, y] = fit(saved?.x ?? b.maxX - 16, saved?.y ?? b.maxY);
  tx = x; ty = y;
  addEventListener('pagehide', () => { try { sessionStorage.setItem(POS, JSON.stringify({ x, y })); } catch { /* not kept */ } });
  restUntil = performance.now() + 1200;
  sync();
}
