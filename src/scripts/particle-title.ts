type Particle = { x: number; y: number; vx: number; vy: number; ax: number; ay: number; bx: number; by: number; dx: number; dy: number; a: number; accent: boolean };
type Point = { x: number; y: number; accent: boolean };

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/**
 * Redraws the hero wordmark as particles: they assemble on load, dodge the pointer (or a finger) and
 * burst on click/tap. Scrolling to the next panel carries them over and re-forms them as that panel's
 * title (`next`), where they fade out as the real heading rises in. The real <h1> stays in the DOM for
 * reading and selection; CSS hides it once `is-particle` is set. Positions are in document coordinates,
 * drawn on one fixed canvas. Sleeps whenever nothing moves.
 */
export function initParticleTitle(hero: HTMLElement, title: HTMLElement, next: HTMLElement | null) {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  const canvas = ctx.canvas;
  canvas.className = 'hero__particles';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const tokens = getComputedStyle(document.documentElement);
  const paper = tokens.getPropertyValue('--paper').trim();
  const lamp = tokens.getPropertyValue('--lamp').trim();

  let ps: Particle[] = [];
  let dpr = 1, dot = 2, reach = 80, endY = 1, frame = 0, last = 0, lag = 0, blank = false, arrivedAt = 0;
  let pointer: { x: number; y: number } | null = null;

  const wake = () => { if (!frame) { last = performance.now(); frame = requestAnimationFrame(tick); } };
  const at = (x: number, y: number) => ({ x, y: y + scrollY });
  const progress = () => clamp01(scrollY / endY);

  // Each glyph is drawn where the DOM put it, so letter-spacing and kerning match the real heading.
  function sample(el: HTMLElement, gap: number): Point[] {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el), pad = Math.ceil(parseFloat(cs.fontSize) * .25);
    const w = Math.ceil(r.width) + pad * 2, h = Math.ceil(r.height) + pad * 2;
    const o = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    o.canvas.width = w; o.canvas.height = h;
    o.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const mark = document.createElement('span'); // a zero-size inline-block sits on the baseline
    mark.style.cssText = 'display:inline-block;width:0;height:0';
    el.append(mark);
    const base = mark.getBoundingClientRect().top - r.top + pad;
    mark.remove();
    const range = document.createRange();
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walk.nextNode() as Text | null; node; node = walk.nextNode() as Text | null) {
      o.fillStyle = node.parentElement === el ? '#f00' : '#0f0'; // green = the accent "."
      for (let i = 0; i < node.length; i++) {
        range.setStart(node, i); range.setEnd(node, i + 1);
        o.fillText(node.data[i], range.getBoundingClientRect().left - r.left + pad, base);
      }
    }
    const img = o.getImageData(0, 0, w, h).data, points: Point[] = [];
    for (let y = 0; y < h; y += gap) for (let x = 0; x < w; x += gap) {
      const i = (y * w + x) * 4;
      if (img[i + 3] >= 128) points.push({ x: r.left - pad + x, y: r.top + scrollY - pad + y, accent: img[i + 1] > img[i] });
    }
    return points.sort((p, q) => p.x - q.x);
  }

  // The canvas matches the current viewport in CSS pixels. Not 100vh: on phones that is the height with
  // the address bar hidden, which would stretch the drawing and land the particles below their targets.
  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
    blank = false;
    wake();
  }

  let sampledWidth = 0;
  function layout() {
    size();
    sampledWidth = innerWidth;
    const font = parseFloat(getComputedStyle(title).fontSize), gap = Math.max(3, Math.round(font / 32));
    dot = gap * .72; reach = font * .9;
    const from = sample(title, gap), to = next ? sample(next, gap) : from;
    const panel = next?.closest<HTMLElement>('.snap-panel');
    const header = document.querySelector<HTMLElement>('.header')?.offsetHeight ?? 0;
    endY = panel ? Math.max(1, panel.getBoundingClientRect().top + scrollY - header) : hero.offsetHeight;
    const old = ps, w = innerWidth, h = innerHeight;
    ps = from.map((p, i) => {
      const q = to[Math.floor(i * to.length / from.length)] ?? p, prev = old[i];
      const angle = Math.random() * Math.PI * 2, far = .35 + Math.random() * .65, dx = Math.cos(angle) * far, dy = Math.sin(angle) * far;
      return { ax: p.x, ay: p.y, bx: q.x, by: q.y, dx, dy, x: prev?.x ?? p.x + dx * w * .6, y: prev?.y ?? p.y + dy * h * .6, vx: 0, vy: 0, a: .55 + Math.random() * .45, accent: p.accent };
    });
  }

  // Fixed 60 Hz steps, so 120 Hz screens and throttled tabs move at the same pace.
  function tick(now: number) {
    frame = 0;
    lag = Math.min(lag + now - last, 100);
    last = now;
    let energy = 0;
    for (; lag >= 16; lag -= 16) energy = step();
    const fading = draw(now);
    if (energy === 0 || energy > ps.length * .01 || fading) frame = requestAnimationFrame(tick);
  }

  // The way over: from the wordmark to the next title, flaring out in the first three quarters.
  function step() {
    let energy = .001;
    const p = progress(), e = smooth(p), flare = Math.sin(clamp01(p / .75) * Math.PI) * Math.min(innerWidth, innerHeight) * .16;
    for (const q of ps) {
      let ax = (q.ax + (q.bx - q.ax) * e + q.dx * flare - q.x) * .06;
      let ay = (q.ay + (q.by - q.ay) * e + q.dy * flare - q.y) * .06;
      if (pointer) {
        const ddx = q.x - pointer.x, ddy = q.y - pointer.y, d = Math.hypot(ddx, ddy);
        if (d < reach && d > .01) { const f = (1 - d / reach) ** 2 * 6; ax += ddx / d * f; ay += ddy / d * f; }
      }
      q.vx = (q.vx + ax) * .84; q.vy = (q.vy + ay) * .84;
      q.x += q.vx; q.y += q.vy;
      energy += Math.abs(q.vx) + Math.abs(q.vy);
    }
    return energy;
  }

  // Fast particles flash in the accent color, so a burst reads as a pulse of light. Once they have
  // landed on the next title they hold the shape a moment, then fade into the real heading.
  // Returns whether that fade is still running.
  function draw(now: number) {
    if (progress() < .98) arrivedAt = 0;
    else arrivedAt ||= now;
    const fade = arrivedAt ? 1 - smooth(clamp01((now - arrivedAt - 300) / 600)) : 1;
    if (fade === 0 && blank) return false;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, -scrollY * dpr);
    ctx!.clearRect(0, scrollY, innerWidth, innerHeight);
    blank = fade === 0;
    if (blank) return false;
    for (const hot of [false, true]) {
      ctx!.fillStyle = hot ? lamp : paper;
      for (const p of ps) {
        if ((p.accent || Math.abs(p.vx) + Math.abs(p.vy) > 3) !== hot) continue;
        ctx!.globalAlpha = p.a * fade;
        ctx!.fillRect(p.x, p.y, dot, dot);
      }
    }
    ctx!.globalAlpha = 1;
    return fade < 1;
  }

  function burst(x: number, y: number) {
    const r = reach * 4;
    for (const p of ps) {
      const ddx = p.x - x, ddy = p.y - y, d = Math.hypot(ddx, ddy) || 1, f = Math.max(0, 1 - d / r) * 22;
      p.vx += ddx / d * f + (Math.random() - .5) * f * .4;
      p.vy += ddy / d * f + (Math.random() - .5) * f * .4;
    }
    wake();
  }

  hero.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') { pointer = at(e.clientX, e.clientY); wake(); } });
  hero.addEventListener('pointerleave', () => { pointer = null; wake(); });
  hero.addEventListener('pointerdown', e => {
    const p = at(e.clientX, e.clientY);
    burst(p.x, p.y);
    document.dispatchEvent(new CustomEvent('beep:burst', { detail: { x: e.clientX, y: e.clientY } }));
  });
  // touchmove keeps firing while the page scrolls, so a finger can sweep the letters on the way down.
  hero.addEventListener('touchmove', e => { const t = e.touches[0]; pointer = at(t.clientX, t.clientY); wake(); }, { passive: true });
  hero.addEventListener('touchend', () => { pointer = null; wake(); }, { passive: true });
  addEventListener('scroll', () => { if (!blank || progress() < 1) wake(); }, { passive: true });
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  // Measure once fonts are in and the next title isn't mid-entrance (its rise would offset the targets).
  const settled = () => Promise.allSettled(next?.getAnimations().map(a => a.finished) ?? []);
  // Height-only resizes (a phone's address bar sliding away mid-scroll) keep the layout: just refit the canvas.
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => (innerWidth === sampledWidth ? size() : void settled().then(layout)), 150);
  });

  return document.fonts.ready.then(settled).then(() => { layout(); title.classList.add('is-particle'); });
}
