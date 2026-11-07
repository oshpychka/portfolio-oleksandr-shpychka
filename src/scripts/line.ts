import { gsap, ScrollTrigger, MOTION, DESKTOP } from './gsap';
import { logo, LOGO_BOX } from '../data/logo';

const NS = 'http://www.w3.org/2000/svg';
const HEAD_AT = 0.68;
const SAMPLE_STEP = 6;

type Point = { x: number; y: number };
type Tone = 'hero' | 'dark' | 'cream';

interface Node {
  length: number;
  point: Point;
  tone: Tone;
  lit: boolean;
  circle?: SVGCircleElement;
  item?: HTMLElement;
  labels: HTMLElement[];
}

interface Geometry {
  d: string;
  total: number;
  lettersLength: number;
  samplesLength: Float32Array;
  samplesY: Float32Array;
  nodes: Node[];
  heroHeight: number;
}

const docRect = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { left: r.left + scrollX, top: r.top + scrollY, right: r.right + scrollX, bottom: r.bottom + scrollY, width: r.width, height: r.height };
};

const toneOf = (section: Element): Tone =>
  section.hasAttribute('data-line-hero') ? 'hero' : section.classList.contains('theme-cream') ? 'cream' : 'dark';

function transformLetters(d: string, box: { left: number; top: number; width: number }) {
  const s = box.width / LOGO_BOX.width;
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  let out = '';
  let pair: number[] = [];
  for (const token of tokens) {
    if (/[A-Za-z]/.test(token)) {
      out += ` ${token}`;
      continue;
    }
    pair.push(Number(token));
    if (pair.length === 2) {
      const x = box.left + (pair[0] - LOGO_BOX.x) * s;
      const y = box.top + (pair[1] - LOGO_BOX.y) * s;
      out += ` ${x.toFixed(2)} ${y.toFixed(2)}`;
      pair = [];
    }
  }
  const exitMatch = logo.letters.match(/(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s*$/);
  const exit = exitMatch
    ? { x: box.left + (Number(exitMatch[1]) - LOGO_BOX.x) * s, y: box.top + (Number(exitMatch[2]) - LOGO_BOX.y) * s }
    : { x: box.left + box.width, y: box.top };
  return { d: out.trim(), exit };
}

function roundedPolyline(points: Point[], radius: number) {
  const clean = points.filter((p, i) => i === 0 || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > 0.5);
  let d = '';
  for (let i = 1; i < clean.length; i++) {
    const prev = clean[i - 1];
    const curr = clean[i];
    const next = clean[i + 1];
    if (!next) {
      d += ` L ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
      continue;
    }
    const inLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const outLen = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const a = { x: curr.x - ((curr.x - prev.x) / inLen) * r, y: curr.y - ((curr.y - prev.y) / inLen) * r };
    const b = { x: curr.x + ((next.x - curr.x) / outLen) * r, y: curr.y + ((next.y - curr.y) / outLen) * r };
    d += ` L ${a.x.toFixed(2)} ${a.y.toFixed(2)} Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  }
  return d;
}

export function initLine() {
  const hero = document.querySelector<HTMLElement>('[data-line-hero]');
  const anchor = document.querySelector<HTMLElement>('[data-logo-anchor]');
  if (!hero || !anchor) return () => {};

  const root = document.documentElement;
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('trace');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <defs>
      <clipPath id="trace-clip-hero"></clipPath>
      <clipPath id="trace-clip-dark"></clipPath>
      <clipPath id="trace-clip-cream"></clipPath>
    </defs>
    <g clip-path="url(#trace-clip-hero)"><path class="trace__path trace__path--hero"></path></g>
    <g clip-path="url(#trace-clip-dark)"><path class="trace__path trace__path--dark"></path></g>
    <g clip-path="url(#trace-clip-cream)"><path class="trace__path trace__path--cream"></path></g>
    <g class="trace__nodes"></g>`;
  document.body.appendChild(svg);
  root.classList.add('has-line');

  const paths = [...svg.querySelectorAll<SVGPathElement>('.trace__path')];
  const nodesGroup = svg.querySelector<SVGGElement>('.trace__nodes')!;
  const clips: Record<Tone, SVGClipPathElement> = {
    hero: svg.querySelector('#trace-clip-hero')!,
    dark: svg.querySelector('#trace-clip-dark')!,
    cream: svg.querySelector('#trace-clip-cream')!,
  };

  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = () => window.matchMedia(DESKTOP).matches;

  let geo: Geometry | null = null;
  const state = { start: 0, head: 0, intro: reduce() ? 1 : 0 };

  const build = (): Geometry => {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.scrollHeight;
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const isDesktop = desktop();
    const container = hero.querySelector<HTMLElement>('.container') ?? hero;
    const gutter = parseFloat(getComputedStyle(container).paddingLeft) || 16;
    const laneL = Math.round(gutter / 2);
    const laneR = Math.round(width - gutter / 2);
    const radius = isDesktop ? 28 : 14;

    const a = docRect(anchor);
    const letters = transformLetters(logo.letters, a);

    const sections = [...document.querySelectorAll<HTMLElement>('main > section')];
    const nodeSpecs: Array<{ point: Point; tone: Tone; labels: HTMLElement[]; item?: HTMLElement }> = [];
    const pts: Point[] = [letters.exit];

    const heroRect = docRect(hero);
    pts.push({ x: laneR, y: letters.exit.y });

    sections.forEach((section, index) => {
      if (section === hero) return;
      const rect = docRect(section);
      const tone = toneOf(section);
      const head = section.querySelector<HTMLElement>('[data-node-head]');
      const pad = parseFloat(getComputedStyle(section).paddingTop) || 96;
      const isLast = index === sections.length - 1;
      const headRect = head ? docRect(head.querySelector('span') ?? head) : null;
      const nodeY = headRect ? headRect.top + headRect.height / 2 : rect.top + pad;

      if (isDesktop || pts[pts.length - 1].x !== laneL) {
        const yIn = rect.top + Math.min(pad * 0.42, Math.max(24, nodeY - rect.top - 48));
        pts.push({ x: pts[pts.length - 1].x, y: yIn });
        pts.push({ x: laneL, y: yIn });
      }
      pts.push({ x: laneL, y: nodeY });
      nodeSpecs.push({ point: { x: laneL, y: nodeY }, tone, labels: head ? [...head.querySelectorAll<HTMLElement>('[data-scramble="node"]')] : [] });

      const timeline = section.querySelector<HTMLElement>('[data-timeline]');
      if (timeline) {
        const t = docRect(timeline);
        const axisX = t.left + 6.5;
        const items = [...timeline.querySelectorAll<HTMLElement>(':scope > li')];
        const yJog = t.top - Math.min(22, (t.top - nodeY) / 3);
        pts.push({ x: laneL, y: yJog });
        pts.push({ x: axisX, y: yJog });
        items.forEach((item) => {
          const r = docRect(item);
          const p = { x: axisX, y: r.top + 10.5 };
          pts.push(p);
          nodeSpecs.push({ point: p, tone, labels: [], item });
        });
      }

      if (isLast) {
        const footer = section.querySelector('footer');
        const endY = footer ? docRect(footer).top - 48 : rect.bottom - pad;
        pts.push({ x: pts[pts.length - 1].x, y: Math.max(endY, pts[pts.length - 1].y + 40) });
        return;
      }

      const yOut = rect.bottom - Math.min(pad * 0.45, 120);
      pts.push({ x: pts[pts.length - 1].x, y: yOut });
      if (isDesktop) {
        pts.push({ x: laneR, y: yOut });
      } else if (pts[pts.length - 1].x !== laneL) {
        pts.push({ x: laneL, y: yOut });
      }
    });

    const d = `${letters.d}${roundedPolyline(pts, radius)}`;
    paths.forEach((p) => p.setAttribute('d', d));
    const total = paths[0].getTotalLength();

    const probe = document.createElementNS(NS, 'path');
    probe.setAttribute('d', letters.d);
    svg.appendChild(probe);
    const lettersLength = probe.getTotalLength();
    probe.remove();

    const count = Math.ceil((total - lettersLength) / SAMPLE_STEP) + 1;
    const samplesLength = new Float32Array(count);
    const samplesY = new Float32Array(count);
    let maxY = -Infinity;
    for (let i = 0; i < count; i++) {
      const len = Math.min(total, lettersLength + i * SAMPLE_STEP);
      const pt = paths[0].getPointAtLength(len);
      maxY = Math.max(maxY, pt.y);
      samplesLength[i] = len;
      samplesY[i] = maxY;
    }

    const nearestLength = (p: Point) => {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < count; i++) {
        if (Math.abs(samplesY[i] - p.y) > 40) continue;
        const pt = paths[0].getPointAtLength(samplesLength[i]);
        const dist = Math.hypot(pt.x - p.x, pt.y - p.y);
        if (dist < bestDist) {
          bestDist = dist;
          best = samplesLength[i];
        }
      }
      return best;
    };

    const previous = geo?.nodes ?? [];
    nodesGroup.replaceChildren();
    const nodes: Node[] = nodeSpecs.map((spec, i) => {
      const node: Node = { length: nearestLength(spec.point), point: spec.point, tone: spec.tone, labels: spec.labels, item: spec.item, lit: previous[i]?.lit ?? false };
      if (!spec.item) {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', spec.point.x.toFixed(2));
        c.setAttribute('cy', spec.point.y.toFixed(2));
        c.setAttribute('r', isDesktop ? '5' : '4');
        c.classList.add('trace__node', `trace__node--${spec.tone}`);
        c.classList.toggle('is-lit', node.lit);
        nodesGroup.appendChild(c);
        node.circle = c;
      }
      return node;
    });

    (Object.keys(clips) as Tone[]).forEach((tone) => {
      clips[tone].replaceChildren(
        ...sections
          .filter((s) => toneOf(s) === tone)
          .map((s) => {
            const r = docRect(s);
            const rect = document.createElementNS(NS, 'rect');
            rect.setAttribute('x', '0');
            rect.setAttribute('y', r.top.toFixed(2));
            rect.setAttribute('width', String(width));
            rect.setAttribute('height', r.height.toFixed(2));
            return rect;
          }),
      );
    });

    return { d, total, lettersLength, samplesLength, samplesY, nodes, heroHeight: heroRect.height };
  };

  const headForScroll = (g: Geometry) => {
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    if (scrollY >= maxScroll - 2) return g.total;
    const target = scrollY + innerHeight * HEAD_AT;
    let lo = 0;
    let hi = g.samplesY.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (g.samplesY[mid] <= target) lo = mid;
      else hi = mid - 1;
    }
    return g.samplesLength[lo];
  };

  const startForScroll = (g: Geometry) => g.lettersLength * gsap.utils.clamp(0, 1, scrollY / (g.heroHeight * 0.55));

  const scrambleLabels = (labels: HTMLElement[]) => {
    labels.forEach((el) => {
      const text = el.dataset.text ?? el.textContent ?? '';
      el.dataset.text = text;
      gsap.to(el, { duration: 0.8, ease: 'none', overwrite: true, scrambleText: { text, chars: '01<>/\\[]{}#+=*_', speed: 0.6 } });
    });
  };

  const render = () => {
    if (!geo) return;
    const head = Math.max(0, state.head * state.intro);
    const start = Math.min(state.start, head);
    const visible = Math.max(0, head - start);
    paths.forEach((p) => {
      p.style.strokeDasharray = `${visible.toFixed(1)} ${(geo!.total + 10).toFixed(1)}`;
      p.style.strokeDashoffset = `${(-start).toFixed(1)}`;
    });
    geo.nodes.forEach((node) => {
      const reached = head >= node.length - 1;
      if (reached === node.lit) return;
      node.lit = reached;
      node.circle?.classList.toggle('is-lit', reached);
      node.item?.classList.toggle('is-lit', reached);
      if (reached && state.intro >= 1) {
        scrambleLabels(node.labels);
        document.dispatchEvent(new CustomEvent('line:node', { detail: { tone: node.tone } }));
      }
    });
  };

  const cleanups: Array<() => void> = [];
  const mm = gsap.matchMedia();

  mm.add({ motion: MOTION, reduced: '(prefers-reduced-motion: reduce)' }, (ctx) => {
    geo = build();
    if (ctx.conditions?.reduced) {
      state.intro = 1;
      state.start = 0;
      state.head = geo.total;
      render();
      return;
    }

    const toHead = gsap.quickTo(state, 'head', { duration: 0.6, ease: 'power3.out', onUpdate: render });
    const toStart = gsap.quickTo(state, 'start', { duration: 0.6, ease: 'power3.out', onUpdate: render });

    state.head = headForScroll(geo);
    state.start = startForScroll(geo);
    const intro = gsap.fromTo(state, { intro: 0 }, { intro: 1, duration: 2.4, ease: 'power2.inOut', onUpdate: render, delay: 0.2 });

    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: () => {
        if (!geo) return;
        toHead(headForScroll(geo));
        toStart(startForScroll(geo));
      },
      onRefresh: () => {
        if (!geo) return;
        toHead(headForScroll(geo));
        toStart(startForScroll(geo));
      },
    });

    return () => {
      intro.kill();
      trigger.kill();
    };
  });
  cleanups.push(() => mm.revert());

  let timer = 0;
  let lastWidth = document.documentElement.clientWidth;
  let lastHeight = document.documentElement.scrollHeight;
  const rebuild = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const w = document.documentElement.clientWidth;
      const h = document.documentElement.scrollHeight;
      if (w === lastWidth && h === lastHeight && geo) return;
      lastWidth = w;
      lastHeight = h;
      geo = build();
      if (reduce()) state.head = geo.total;
      else {
        state.head = headForScroll(geo);
        state.start = startForScroll(geo);
      }
      render();
    }, 180);
  };
  const ro = new ResizeObserver(rebuild);
  ro.observe(document.body);
  window.addEventListener('resize', rebuild);
  document.fonts?.ready.then(() => {
    lastHeight = -1;
    rebuild();
  });
  cleanups.push(() => {
    window.clearTimeout(timer);
    ro.disconnect();
    window.removeEventListener('resize', rebuild);
  });

  return () => {
    cleanups.forEach((fn) => fn());
    svg.remove();
    root.classList.remove('has-line');
    geo = null;
  };
}
