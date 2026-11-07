import { gsap } from './gsap';
import { play } from './sound';

type Piece = { el: SVGGElement; cx: number; cy: number; x: number; y: number; r: number; startR: number; placed: boolean };

const SNAP = 34;

export function initGame() {
  const svg = document.querySelector<SVGSVGElement>('[data-game]');
  if (!svg) return () => {};
  const status = document.querySelector<HTMLElement>('[data-game-status]');
  const done = document.querySelector<HTMLElement>('[data-game-done]');
  const hint = document.querySelector<HTMLElement>('[data-game-hint]');
  const count = document.querySelector<HTMLElement>('[data-game-count]');
  const NS = 'http://www.w3.org/2000/svg';
  let touched = false;
  const tag = document.createElementNS(NS, 'g');
  tag.setAttribute('class', 'game__tag');
  tag.setAttribute('aria-hidden', 'true');
  tag.innerHTML = '<rect x="-36" y="-11" width="72" height="22" rx="11"></rect><text x="0" y="0">DRAG ME</text>';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pieces: Piece[] = [...svg.querySelectorAll<SVGGElement>('[data-piece]')].map((el) => {
    const box = el.querySelector<SVGPathElement>('.game__stroke')!.getBBox();
    return { el, cx: box.x + box.width / 2, cy: box.y + box.height / 2, x: 0, y: 0, r: 0, startR: 0, placed: false };
  });

  const apply = (p: Piece) => {
    p.el.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${p.r.toFixed(2)} ${p.cx} ${p.cy})`);
    if (p === pieces[0] && !touched) tag.setAttribute('transform', `translate(${(p.cx + p.x).toFixed(1)} ${(p.cy + p.y - 46).toFixed(1)})`);
  };
  const updateCount = () => {
    if (count) count.textContent = `${pieces.filter((q) => q.placed).length} / ${pieces.length}`;
  };
  let nudge: gsap.core.Timeline | null = null;
  const startNudge = () => {
    nudge?.kill();
    if (reduce || touched) return;
    const p = pieces[0];
    nudge = gsap.timeline({ repeat: -1, repeatDelay: 1.6, delay: 1.8 });
    nudge
      .to(p, { r: '+=10', duration: 0.12, ease: 'power2.out', onUpdate: () => apply(p) })
      .to(p, { r: '-=20', duration: 0.18, ease: 'power2.inOut', onUpdate: () => apply(p) })
      .to(p, { r: '+=10', duration: 0.3, ease: 'elastic.out(1, 0.4)', onUpdate: () => apply(p) });
  };
  const firstTouch = () => {
    if (touched) return;
    touched = true;
    nudge?.kill();
    gsap.to(tag, { autoAlpha: 0, duration: 0.25, onComplete: () => tag.remove() });
  };

  const spots = [
    [-150, -70],
    [-140, 80],
    [110, -95],
    [150, 85],
    [-20, 120],
  ];
  const scatter = () => {
    svg.classList.remove('is-assembled');
    if (done) done.hidden = true;
    if (hint) hint.hidden = false;
    if (status) status.textContent = '';
    pieces.forEach((p, i) => {
      const [sx, sy] = spots[i % spots.length];
      const target = { x: sx + (Math.random() - 0.5) * 30, y: sy + (Math.random() - 0.5) * 20, r: (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 110) };
      p.placed = false;
      p.startR = target.r;
      p.el.classList.remove('is-placed');
      p.el.setAttribute('aria-pressed', 'false');
      gsap.to(p, { ...target, duration: reduce ? 0 : 1.1, delay: reduce ? 0 : 0.35 + i * 0.05, ease: 'expo.out', onUpdate: () => apply(p) });
    });
    updateCount();
    startNudge();
  };

  const finish = () => {
    svg.classList.add('is-assembled');
    if (status) status.textContent = 'Assembled. System restored.';
    if (done) done.hidden = false;
    if (hint) hint.hidden = true;
    play('enter');
  };

  const place = (p: Piece) => {
    if (p.placed) return;
    p.placed = true;
    firstTouch();
    p.el.classList.add('is-placed');
    p.el.setAttribute('aria-pressed', 'true');
    gsap.to(p, { x: 0, y: 0, r: 0, duration: reduce ? 0 : 0.45, ease: 'back.out(2)', overwrite: true, onUpdate: () => apply(p) });
    play('node');
    updateCount();
    const left = pieces.filter((q) => !q.placed).length;
    if (status) status.textContent = left ? `${left} ${left === 1 ? 'piece' : 'pieces'} left` : '';
    if (!left) window.setTimeout(finish, reduce ? 0 : 450);
  };

  let drag: { p: Piece; id: number; ox: number; oy: number } | null = null;
  const toSvg = (e: PointerEvent) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM()!.inverse());
  };

  const onDown = (e: PointerEvent) => {
    const el = (e.target as Element).closest<SVGGElement>('[data-piece]');
    const p = pieces.find((q) => q.el === el);
    if (!p || p.placed) return;
    e.preventDefault();
    firstTouch();
    gsap.killTweensOf(p);
    const s = toSvg(e);
    drag = { p, id: e.pointerId, ox: s.x - p.x, oy: s.y - p.y };
    p.el.setPointerCapture(e.pointerId);
    p.el.classList.add('is-dragging');
    svg.appendChild(p.el);
    play('click');
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const s = toSvg(e);
    const p = drag.p;
    p.x = s.x - drag.ox;
    p.y = s.y - drag.oy;
    const dist = Math.hypot(p.x, p.y);
    p.r = p.startR * Math.min(1, dist / 90);
    p.el.classList.toggle('is-near', dist < SNAP);
    apply(p);
  };

  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = drag.p;
    p.el.classList.remove('is-dragging', 'is-near');
    drag = null;
    if (Math.hypot(p.x, p.y) < SNAP) place(p);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = (e.target as Element).closest<SVGGElement>('[data-piece]');
    const p = pieces.find((q) => q.el === el);
    if (!p) return;
    e.preventDefault();
    place(p);
  };

  const restart = document.querySelector<HTMLButtonElement>('[data-game-restart]');
  const onRestart = () => scatter();

  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
  svg.addEventListener('keydown', onKey);
  restart?.addEventListener('click', onRestart);
  svg.classList.add('is-live');
  svg.appendChild(tag);
  scatter();

  return () => {
    nudge?.kill();
    tag.remove();
    pieces.forEach((p) => gsap.killTweensOf(p));
    svg.removeEventListener('pointerdown', onDown);
    svg.removeEventListener('pointermove', onMove);
    svg.removeEventListener('pointerup', onUp);
    svg.removeEventListener('pointercancel', onUp);
    svg.removeEventListener('keydown', onKey);
    restart?.removeEventListener('click', onRestart);
  };
}
