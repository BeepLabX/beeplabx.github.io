export type Errand = { x: number; y: number; accept: () => void; done: () => void };

/**
 * Lamplighter's panel arrives in the dark once per page load. The four lamps on its card (the game's
 * own lamp art, see ProjectArt) are unlit; Totillu runs from lamp to lamp lighting them (`beep:errand`)
 * and a press on a lamp helps. Lit lamps stay lit as part of the card. When the last one catches, the
 * light spreads from the lamps and the page comes back. If Totillu is resting or held, the lamps catch
 * one after another on their own. Returns a function that lights everything at once.
 */
export function lightsOut(panel: HTMLElement) {
  const lamps = [...panel.querySelectorAll<HTMLElement>('.art__lamps i')];
  const veil = document.createElement('div');
  veil.className = 'veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.innerHTML = `<div class="veil__dark"></div><span class="veil__hint">토틸루가 등불을 켜는 중 · 등불을 ${matchMedia('(hover: hover)').matches ? '클릭' : '탭'}해서 돕기</span>`;
  document.body.append(veil);
  const dark = veil.firstElementChild as HTMLElement;
  const pet = document.querySelector<HTMLElement>('[data-companion] button');
  const center = (el: Element) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const isLit = (el: Element) => el.classList.contains('is-lit');

  // Darkness = one mask layer per light: the pointer's beam, Totillu's lantern and every lit lamp.
  // Rebuilt each frame because the card is still settling into place while this starts.
  const px = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);
  const hole = (r: string, x: number | string, y: number | string, core: number) =>
    `radial-gradient(circle calc(var(--hole) * ${r}) at ${px(x)} ${px(y)}, transparent ${core}%, #000 100%)`;
  let frame = 0, finished = false;
  const follow = () => {
    const layers = [hole('1.2', 'var(--lx, -999px)', 'var(--ly, -999px)', 30)];
    const c = pet?.getBoundingClientRect();
    if (c?.width) layers.push(hole('.7', c.left + c.width / 2, c.top + c.height / 2, 25));
    for (const l of lamps) { const [x, y] = center(l); layers.push(isLit(l) ? hole('1', x, y, 35) : hole('.3', x, y, 30)); } // unlit: just enough to find
    dark.style.maskImage = dark.style.webkitMaskImage = layers.join(',');
    frame = requestAnimationFrame(follow);
  };
  const aim = (e: PointerEvent) => { veil.style.setProperty('--lx', `${e.clientX}px`); veil.style.setProperty('--ly', `${e.clientY}px`); };
  const help = (e: Event) => { const l = (e.target as Element).closest('.art__lamps i'); if (l) light(l as HTMLElement); };
  addEventListener('pointermove', aim, { passive: true });
  panel.addEventListener('pointerdown', help);
  panel.classList.add('is-dark');
  follow();

  let errandTimer: ReturnType<typeof setTimeout> | undefined;
  function nextErrand() {
    clearTimeout(errandTimer);
    if (finished) return;
    const c = pet?.getBoundingClientRect();
    const from = c?.width ? [c.left + c.width / 2, c.top + c.height / 2] : [0, 0];
    const dist = (l: HTMLElement) => { const [x, y] = center(l); return Math.hypot(x - from[0], y - from[1]); };
    const lamp = lamps.filter(l => !isLit(l)).sort((a, b) => dist(a) - dist(b))[0];
    if (!lamp) return;
    const [x, y] = center(lamp);
    let accepted = false;
    const errand: Errand = { x, y, accept: () => { accepted = true; }, done: () => light(lamp) };
    document.dispatchEvent(new CustomEvent('beep:errand', { detail: errand }));
    // Nobody took it (Totillu resting) or it takes too long: the lamp catches by itself.
    errandTimer = setTimeout(() => light(lamp), accepted ? 2500 : 400);
  }

  function light(lamp: HTMLElement) {
    if (isLit(lamp) || finished) return;
    lamp.classList.add('is-lit');
    if (lamps.every(isLit)) finish(1400);
    else nextErrand();
  }

  function finish(spread: number) {
    if (finished) return;
    finished = true;
    clearTimeout(errandTimer);
    clearTimeout(safety);
    removeEventListener('pointermove', aim);
    panel.removeEventListener('pointerdown', help);
    panel.classList.remove('is-dark');
    lamps.forEach(l => l.classList.add('is-lit'));
    document.dispatchEvent(new CustomEvent('beep:errand-end'));
    veil.style.setProperty('--spread', `${spread}ms`);
    veil.classList.add('is-lit');
    setTimeout(() => { cancelAnimationFrame(frame); veil.remove(); }, spread * 2);
  }

  const safety = setTimeout(() => finish(1400), 8000);
  setTimeout(nextErrand, 350); // let the snap land first so Totillu runs to where the lamps end up
  return () => finish(400);
}
