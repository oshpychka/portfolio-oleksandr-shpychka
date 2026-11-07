const TEXT = 'p, h1, h2, h3, h4, dd, dt, input, textarea, select, [contenteditable="true"], .stack__hint, .exp__points li';
const LINK = 'a[href], button, [role="button"], label, summary';

type State = 'cross' | 'dot' | 'view' | 'hidden';

export function initCursor() {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!fine.matches) return () => {};

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.className = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span class="cursor__shape"></span><span class="cursor__label mono">View</span><span class="cursor__coords mono"></span>';
  document.body.appendChild(el);
  const coords = el.querySelector<HTMLElement>('.cursor__coords')!;
  root.classList.add('has-cursor');

  const target = { x: -100, y: -100 };
  const pos = { x: -100, y: -100 };
  let state: State = 'cross';
  let onGrid = false;
  let tone = 'dark';
  let lastCoords = 0;
  let raf = 0;
  let seen = false;

  const setState = (next: State) => {
    if (next === state) return;
    state = next;
    el.dataset.state = next;
  };
  el.dataset.state = state;

  const pad = (n: number) => String(Math.max(0, Math.round(n))).padStart(4, '0');

  const loop = () => {
    raf = 0;
    const k = reduce ? 1 : 0.28;
    pos.x += (target.x - pos.x) * k;
    pos.y += (target.y - pos.y) * k;
    el.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
    const now = performance.now();
    if (onGrid && state === 'cross' && now - lastCoords > 100) {
      lastCoords = now;
      coords.textContent = `X ${pad(target.x + scrollX)}  Y ${pad(target.y + scrollY)}`;
    }
    if (Math.abs(target.x - pos.x) > 0.2 || Math.abs(target.y - pos.y) > 0.2) raf = requestAnimationFrame(loop);
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const classify = (node: Element | null): State => {
    if (!node) return 'cross';
    if (node.closest('[data-physics-body], [data-piece], .prow, .boot, .site-menu')) return 'hidden';
    if (node.closest('.card__link')) return 'view';
    if (node.closest(LINK)) return 'dot';
    if (node.closest(TEXT)) return 'hidden';
    return 'cross';
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    target.x = e.clientX;
    target.y = e.clientY;
    if (!seen) {
      seen = true;
      pos.x = target.x;
      pos.y = target.y;
      el.classList.add('is-visible');
    }
    kick();
  };

  const onOver = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const node = e.target as Element;
    setState(classify(node));
    const toned = node.closest?.('.theme-cream, .theme-dark, .theme-indigo');
    const nextTone = toned?.classList.contains('theme-cream') ? 'cream' : 'dark';
    if (nextTone !== tone) {
      tone = nextTone;
      el.dataset.tone = tone;
    }
    const grid = !!node.closest?.('.blueprint-grid');
    if (grid !== onGrid) {
      onGrid = grid;
      el.classList.toggle('is-grid', grid);
    }
  };

  const onLeaveWindow = () => {
    seen = false;
    el.classList.remove('is-visible');
  };
  const onDown = () => el.classList.add('is-down');
  const onUp = () => el.classList.remove('is-down');

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerover', onOver, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeaveWindow);
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerover', onOver);
    document.documentElement.removeEventListener('pointerleave', onLeaveWindow);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    el.remove();
    root.classList.remove('has-cursor');
  };
}
