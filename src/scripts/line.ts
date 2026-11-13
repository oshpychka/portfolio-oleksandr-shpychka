import { gsap, ScrollTrigger, DESKTOP } from './gsap';
import { logo, LOGO_BOX } from '../data/logo';

const NS = 'http://www.w3.org/2000/svg';
const HEAD_AT = 0.68;
const TOP_ZONE = 220;
const SAMPLE_STEP = 8;

type Point = { x: number; y: number };
type Tone = 'hero' | 'dark' | 'cream';
type Segment = { a: Point; c?: Point; b: Point; length: number; start: number };

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
  total: number;
  lettersLength: number;
  stub: number;
  samplesLength: Float32Array;
  samplesY: Float32Array;
  nodes: Node[];
  heroHeight: number;
  finale: { y: number; length: number } | null;
}

const docRect = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { left: r.left + scrollX, top: r.top + scrollY, right: r.right + scrollX, bottom: r.bottom + scrollY, width: r.width, height: r.height };
};

const toneOf = (section: Element): Tone =>
  section.hasAttribute('data-line-hero') ? 'hero' : section.classList.contains('theme-cream') ? 'cream' : 'dark';

const fmt = (n: number) => n.toFixed(2);

function transformLetters(d: string, box: { left: number; top: number; width: number }) {
  const s = box.width / LOGO_BOX.width;
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  let out = '';
  let pair: number[] = [];
  let last: Point = { x: 0, y: 0 };
  for (const token of tokens) {
    if (/[A-Za-z]/.test(token)) {
      out += ` ${token}`;
      continue;
    }
    pair.push(Number(token));
    if (pair.length === 2) {
      last = { x: box.left + (pair[0] - LOGO_BOX.x) * s, y: box.top + (pair[1] - LOGO_BOX.y) * s };
      out += ` ${fmt(last.x)} ${fmt(last.y)}`;
      pair = [];
    }
  }
  return { d: out.trim(), exit: last, scale: s };
}

function parseSegments(d: string) {
  const segments: Array<Pick<Segment, 'a' | 'c' | 'b'>> = [];
  let cursor: Point = { x: 0, y: 0 };
  for (const command of d.match(/[MLQ][^MLQ]*/g) ?? []) {
    const n = command.slice(1).trim().split(/\s+/).map(Number);
    if (command[0] === 'M') cursor = { x: n[0], y: n[1] };
    else if (command[0] === 'L') segments.push({ a: cursor, b: (cursor = { x: n[0], y: n[1] }) });
    else segments.push({ a: cursor, c: { x: n[0], y: n[1] }, b: (cursor = { x: n[2], y: n[3] }) });
  }
  return segments;
}

function quadLength(a: Point, c: Point, b: Point) {
  let len = 0;
  let prev = a;
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    const mt = 1 - t;
    const p = { x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x, y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y };
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
}

const segmentLength = (s: Pick<Segment, 'a' | 'c' | 'b'>) =>
  s.c ? quadLength(s.a, s.c, s.b) : Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);

function buildTail(points: Point[], radius: number, offset: number) {
  const clean = points.filter((p, i) => i === 0 || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > 0.5);
  const segments: Segment[] = [];
  const vertexLength = new Map<Point, number>();
  let cursor = clean[0];
  let length = offset;
  const push = (seg: Pick<Segment, 'a' | 'c' | 'b'>) => {
    const l = segmentLength(seg);
    if (l < 0.01) return;
    segments.push({ ...seg, length: l, start: length });
    length += l;
  };
  vertexLength.set(clean[0], offset);
  for (let i = 1; i < clean.length; i++) {
    const prev = clean[i - 1];
    const curr = clean[i];
    const next = clean[i + 1];
    if (!next) {
      push({ a: cursor, b: curr });
      vertexLength.set(curr, length);
      cursor = curr;
      continue;
    }
    const inLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const outLen = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const a = { x: curr.x - ((curr.x - prev.x) / inLen) * r, y: curr.y - ((curr.y - prev.y) / inLen) * r };
    const b = { x: curr.x + ((next.x - curr.x) / outLen) * r, y: curr.y + ((next.y - curr.y) / outLen) * r };
    push({ a: cursor, b: a });
    const before = length;
    push({ a, c: curr, b });
    vertexLength.set(curr, before + (length - before) / 2);
    cursor = b;
  }
  const d = segments
    .map((s) => (s.c ? ` L ${fmt(s.a.x)} ${fmt(s.a.y)} Q ${fmt(s.c.x)} ${fmt(s.c.y)} ${fmt(s.b.x)} ${fmt(s.b.y)}` : ` L ${fmt(s.b.x)} ${fmt(s.b.y)}`))
    .join('');
  return { d, segments, end: length, vertexLength };
}

function sampleTail(segments: Segment[], lettersLength: number) {
  const lengths: number[] = [lettersLength];
  const ys: number[] = [segments[0]?.a.y ?? 0];
  let maxY = ys[0];
  for (const s of segments) {
    const steps = Math.max(1, Math.ceil(s.length / SAMPLE_STEP));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const y = s.c ? mt * mt * s.a.y + 2 * mt * t * s.c.y + t * t * s.b.y : s.a.y + (s.b.y - s.a.y) * t;
      maxY = Math.max(maxY, y);
      lengths.push(s.start + s.length * t);
      ys.push(maxY);
    }
  }
  return { samplesLength: Float32Array.from(lengths), samplesY: Float32Array.from(ys) };
}

interface Chunk {
  svg: SVGSVGElement;
  path: SVGPathElement;
  from: number;
  to: number;
  dash: string;
}

function segmentPath(segments: Segment[]) {
  return segments
    .map((s) => (s.c ? ` L ${fmt(s.a.x)} ${fmt(s.a.y)} Q ${fmt(s.c.x)} ${fmt(s.c.y)} ${fmt(s.b.x)} ${fmt(s.b.y)}` : ` L ${fmt(s.b.x)} ${fmt(s.b.y)}`))
    .join('');
}

function pointOn(segments: Segment[], len: number): Point | null {
  let lo = 0;
  let hi = segments.length - 1;
  if (hi < 0 || len < segments[0].start) return null;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (segments[mid].start <= len) lo = mid;
    else hi = mid - 1;
  }
  const s = segments[lo];
  const t = Math.min(1, Math.max(0, (len - s.start) / s.length));
  if (!s.c) return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
  const mt = 1 - t;
  return { x: mt * mt * s.a.x + 2 * mt * t * s.c.x + t * t * s.b.x, y: mt * mt * s.a.y + 2 * mt * t * s.c.y + t * t * s.b.y };
}

export function initLine() {
  const hero = document.querySelector<HTMLElement>('[data-line-hero]');
  const anchor = document.querySelector<HTMLElement>('[data-logo-anchor]');
  const endAnchor = document.querySelector<HTMLElement>('[data-logo-end]');
  if (!hero || !anchor) return () => {};

  const root = document.documentElement;
  const layer = document.createElement('div');
  layer.className = 'trace';
  layer.setAttribute('aria-hidden', 'true');
  const headDot = document.createElement('span');
  headDot.className = 'trace__head';
  document.body.appendChild(layer);
  root.classList.add('has-line');

  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopQuery = window.matchMedia(DESKTOP);

  let geo: Geometry | null = null;
  let chunks: Chunk[] = [];
  let segments: Segment[] = [];
  let lettersPath: SVGPathElement | null = null;
  const state = { start: 0, head: 0, intro: 0, wiggle: 0 };

  const build = (): Geometry => {
    const width = document.documentElement.clientWidth;
    const isDesktop = desktopQuery.matches;
    const container = hero.querySelector<HTMLElement>('.container') ?? hero;
    const gutter = parseFloat(getComputedStyle(container).paddingLeft) || 16;
    const laneL = Math.round(gutter / 2);
    const laneR = Math.round(width - gutter / 2);
    const radius = isDesktop ? 28 : 14;

    const letters = transformLetters(logo.letters, docRect(anchor));
    const ending = endAnchor ? transformLetters(logo.letters, docRect(endAnchor)) : null;
    const sections = [...document.querySelectorAll<HTMLElement>('main > section')];
    const heroRect = docRect(hero);
    const pts: Point[] = [letters.exit, { x: laneR, y: letters.exit.y }];
    const nodeSpecs: Array<{ point: Point; tone: Tone; labels: HTMLElement[]; item?: HTMLElement; section: HTMLElement }> = [];
    const last = () => pts[pts.length - 1];

    sections.forEach((section, index) => {
      if (section === hero) return;
      const rect = docRect(section);
      const tone = toneOf(section);
      const head = section.querySelector<HTMLElement>('[data-node-head]');
      const pad = parseFloat(getComputedStyle(section).paddingTop) || 96;
      const isLast = index === sections.length - 1;
      const headRect = head ? docRect(head.querySelector('span') ?? head) : null;
      const nodeY = headRect ? headRect.top + headRect.height / 2 : rect.top + pad;

      if (isDesktop || last().x !== laneL) {
        const yIn = rect.top + Math.min(pad * 0.42, Math.max(24, nodeY - rect.top - 48));
        pts.push({ x: last().x, y: yIn }, { x: laneL, y: yIn });
      }
      const nodePoint = { x: laneL, y: nodeY };
      pts.push(nodePoint);
      nodeSpecs.push({ point: nodePoint, tone, section, labels: head ? [...head.querySelectorAll<HTMLElement>('[data-scramble="node"]')] : [] });

      const timeline = section.querySelector<HTMLElement>('[data-timeline]');
      if (timeline) {
        const t = docRect(timeline);
        const axisX = t.left + 6.5;
        const yJog = t.top - Math.min(22, (t.top - nodeY) / 3);
        pts.push({ x: laneL, y: yJog }, { x: axisX, y: yJog });
        timeline.querySelectorAll<HTMLElement>(':scope > li').forEach((item) => {
          const p = { x: axisX, y: docRect(item).top + 10.5 };
          pts.push(p);
          nodeSpecs.push({ point: p, tone, section, labels: [], item });
        });
      }

      if (isLast && ending) {
        const entry = ending.exit;
        const jogY = entry.y - Math.min(96, (entry.y - last().y) / 2);
        pts.push({ x: last().x, y: jogY }, { x: laneR, y: jogY }, { x: laneR, y: entry.y }, entry);
        return;
      }

      if (isLast) {
        const footer = section.querySelector('footer');
        const endY = footer ? docRect(footer).top - 48 : rect.bottom - pad;
        pts.push({ x: last().x, y: Math.max(endY, last().y + 40) });
        return;
      }

      const yOut = rect.bottom - Math.min(pad * 0.45, 120);
      pts.push({ x: last().x, y: yOut });
      if (isDesktop) pts.push({ x: laneR, y: yOut });
      else if (last().x !== laneL) pts.push({ x: laneL, y: yOut });
    });

    const probe = document.createElementNS(NS, 'path');
    probe.setAttribute('d', letters.d);
    const probeSvg = document.createElementNS(NS, 'svg');
    probeSvg.appendChild(probe);
    layer.appendChild(probeSvg);
    const lettersLength = probe.getTotalLength();
    probeSvg.remove();

    const tail = buildTail(pts, radius, lettersLength);
    const { samplesLength, samplesY } = sampleTail(tail.segments, lettersLength);
    segments = [...tail.segments];
    let total = tail.end;
    if (ending) {
      for (const s of parseSegments(ending.d).reverse()) {
        const seg = { a: s.b, c: s.c, b: s.a };
        const l = segmentLength(seg);
        segments.push({ ...seg, length: l, start: total });
        total += l;
      }
    }

    const previous = geo?.nodes ?? [];
    layer.replaceChildren();
    layer.style.height = `${document.documentElement.scrollHeight}px`;
    chunks = [];
    lettersPath = null;
    const sectionChunk = new Map<HTMLElement, SVGSVGElement>();

    sections.forEach((section) => {
      const r = docRect(section);
      const tone = toneOf(section);
      const top = r.top;
      const bottom = r.top + r.height;
      const inside = segments.filter((s) => Math.max(s.a.y, s.b.y, s.c?.y ?? -Infinity) >= top - 4 && Math.min(s.a.y, s.b.y, s.c?.y ?? Infinity) <= bottom + 4);
      const isHero = section === hero;
      if (!inside.length && !isHero) return;
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', `trace__chunk trace__chunk--${tone}`);
      svg.setAttribute('width', String(width));
      svg.setAttribute('height', fmt(r.height));
      svg.setAttribute('viewBox', `0 ${fmt(top)} ${width} ${fmt(r.height)}`);
      svg.style.transform = `translateY(${fmt(top)}px)`;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('class', 'trace__path');
      let from: number;
      let to: number;
      if (isHero) {
        path.setAttribute('d', `${letters.d}${segmentPath(inside)}`);
        from = 0;
        to = inside.length ? inside[inside.length - 1].start + inside[inside.length - 1].length : lettersLength;
        const lp = document.createElementNS(NS, 'path');
        lp.setAttribute('d', letters.d);
        lp.setAttribute('visibility', 'hidden');
        svg.appendChild(lp);
        lettersPath = lp;
      } else {
        path.setAttribute('d', `M ${fmt(inside[0].a.x)} ${fmt(inside[0].a.y)}${segmentPath(inside)}`);
        from = inside[0].start;
        to = inside[inside.length - 1].start + inside[inside.length - 1].length;
      }
      path.setAttribute('visibility', 'hidden');
      svg.appendChild(path);
      layer.appendChild(svg);
      chunks.push({ svg, path, from, to, dash: '' });
      sectionChunk.set(section, svg);
    });
    layer.appendChild(headDot);

    const nodes: Node[] = nodeSpecs.map((spec, i) => {
      const node: Node = {
        length: tail.vertexLength.get(spec.point) ?? tail.end,
        point: spec.point,
        tone: spec.tone,
        labels: spec.labels,
        item: spec.item,
        lit: previous[i]?.lit ?? false,
      };
      const host = sectionChunk.get(spec.section);
      if (!spec.item && host) {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', fmt(spec.point.x));
        c.setAttribute('cy', fmt(spec.point.y));
        c.setAttribute('r', isDesktop ? '6' : '5');
        c.classList.add('trace__node', `trace__node--${spec.tone}`);
        c.classList.toggle('is-lit', node.lit);
        host.appendChild(c);
        node.circle = c;
      }
      return node;
    });

    return {
      total,
      lettersLength,
      stub: Math.max(10, 9 * letters.scale),
      samplesLength,
      samplesY,
      nodes,
      heroHeight: heroRect.height,
      finale: ending ? { y: ending.exit.y, length: total - tail.end } : null,
    };
  };

  const mappedHead = (g: Geometry, y: number) => {
    let lo = 0;
    let hi = g.samplesY.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (g.samplesY[mid] <= y) lo = mid;
      else hi = mid - 1;
    }
    return g.samplesLength[lo];
  };

  const headForScroll = (g: Geometry) => {
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    if (scrollY >= maxScroll - 2) return g.total;
    const rest = g.lettersLength + g.stub;
    const mapped = Math.max(rest, mappedHead(g, scrollY + innerHeight * HEAD_AT));
    const blend = gsap.utils.clamp(0, 1, scrollY / TOP_ZONE);
    const head = rest + (mapped - rest) * blend;
    if (!g.finale) return head;
    const from = Math.min(g.finale.y - innerHeight * HEAD_AT, maxScroll - innerHeight * 0.3);
    const progress = gsap.utils.clamp(0, 1, (scrollY - from) / (maxScroll - from));
    return Math.min(g.total, head + g.finale.length * progress);
  };

  const startForScroll = (g: Geometry) => g.lettersLength * gsap.utils.clamp(0, 1, scrollY / (g.heroHeight * 0.55));

  const scrambleLabels = (labels: HTMLElement[]) => {
    labels.forEach((el) => {
      const text = el.dataset.text ?? el.textContent ?? '';
      el.dataset.text = text;
      gsap.to(el, { duration: 0.8, ease: 'none', overwrite: true, scrambleText: { text, chars: '01<>/\\[]{}#+=*_', speed: 0.6 } });
    });
  };

  let lastHead = -1;
  const render = () => {
    if (!geo) return;
    const head = Math.min(geo.total, Math.max(0, (state.head + state.wiggle) * state.intro));
    const start = Math.min(state.start, head);
    for (const chunk of chunks) {
      const len = chunk.to - chunk.from;
      const vs = Math.max(0, start - chunk.from);
      const ve = Math.min(len, head - chunk.from);
      let dash: string;
      if (ve - vs <= 0.5) dash = 'hidden';
      else if (vs <= 0 && ve >= len) dash = 'full';
      else dash = `${(ve - vs).toFixed(1)}|${(-vs).toFixed(1)}|${(len + 10).toFixed(0)}`;
      if (dash === chunk.dash) continue;
      chunk.dash = dash;
      if (dash === 'hidden') {
        chunk.path.setAttribute('visibility', 'hidden');
      } else if (dash === 'full') {
        chunk.path.removeAttribute('visibility');
        chunk.path.style.strokeDasharray = '';
        chunk.path.style.strokeDashoffset = '';
      } else {
        const [v, o, gap] = dash.split('|');
        chunk.path.removeAttribute('visibility');
        chunk.path.style.strokeDasharray = `${v} ${gap}`;
        chunk.path.style.strokeDashoffset = o;
      }
    }
    if (Math.abs(head - lastHead) > 0.4) {
      lastHead = head;
      let pt: Point | null = null;
      if (head < geo.lettersLength) {
        if (lettersPath) {
          const p = lettersPath.getPointAtLength(Math.max(0, head));
          pt = { x: p.x, y: p.y };
        }
      } else {
        pt = pointOn(segments, head);
      }
      if (pt) headDot.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0)`;
      headDot.classList.toggle('is-on', state.intro >= 1 && head - start > 1);
    }
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
  const tug = (k: number) => k * (geo?.stub ?? 20);
  const idle = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.9, repeatRefresh: true, onUpdate: render });
  idle
    .to(state, { wiggle: () => tug(2.2), duration: 0.16, ease: 'power3.out' })
    .to(state, { wiggle: () => tug(0.3), duration: 0.9, ease: 'elastic.out(1, 0.32)' })
    .to(state, { wiggle: () => tug(1.6), duration: 0.12, ease: 'power3.out' }, '+=0.7')
    .to(state, { wiggle: () => tug(0.1), duration: 0.18, ease: 'power2.in' })
    .to(state, { wiggle: () => tug(1.9), duration: 0.12, ease: 'power3.out' })
    .to(state, { wiggle: 0, duration: 0.8, ease: 'elastic.out(1, 0.3)' })
    .to(state, { wiggle: () => tug(5.5), duration: 0.42, ease: 'power4.out' }, '+=1.1')
    .to(state, { wiggle: () => tug(5.1), duration: 0.35, ease: 'sine.inOut' })
    .to(state, { wiggle: () => tug(-0.4), duration: 0.32, ease: 'back.in(2.4)' })
    .to(state, { wiggle: 0, duration: 0.7, ease: 'elastic.out(1, 0.35)' });

  let atTop = scrollY < 8;
  const setIdle = () => {
    const shouldPlay = atTop && state.intro >= 1 && !reduceQuery.matches && !document.hidden;
    if (shouldPlay && idle.paused()) idle.restart();
    if (!shouldPlay && !idle.paused()) {
      idle.pause();
      gsap.to(state, { wiggle: 0, duration: 0.3, ease: 'power2.out', onUpdate: render });
    }
  };

  const toHead = gsap.quickTo(state, 'head', { duration: 0.6, ease: 'power3.out', onUpdate: render });
  const toStart = gsap.quickTo(state, 'start', { duration: 0.6, ease: 'power3.out', onUpdate: render });

  const sync = (animate: boolean) => {
    if (!geo) return;
    if (reduceQuery.matches) {
      idle.pause();
      state.intro = 1;
      state.start = 0;
      state.head = geo.total;
      state.wiggle = 0;
      render();
      return;
    }
    const head = headForScroll(geo);
    const start = startForScroll(geo);
    if (animate) {
      toHead(head);
      toStart(start);
    } else {
      state.head = head;
      state.start = start;
      render();
    }
    const top = scrollY < 8;
    if (top !== atTop) {
      atTop = top;
      setIdle();
    }
  };

  geo = build();
  sync(false);
  const intro = reduceQuery.matches
    ? null
    : gsap.fromTo(state, { intro: 0 }, { intro: 1, duration: 2.2, ease: 'power2.inOut', delay: 0.15, onUpdate: render, onComplete: setIdle });

  const trigger = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: () => sync(true), onRefresh: () => sync(true) });
  const onReduce = () => {
    sync(false);
    setIdle();
  };
  reduceQuery.addEventListener('change', onReduce);
  document.addEventListener('visibilitychange', setIdle);

  let timer = 0;
  let lastWidth = document.documentElement.clientWidth;
  let lastHeight = document.documentElement.scrollHeight;
  const rebuild = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const w = document.documentElement.clientWidth;
      const h = document.documentElement.scrollHeight;
      if (w === lastWidth && h === lastHeight) return;
      lastWidth = w;
      lastHeight = h;
      geo = build();
      lastHead = -1;
      sync(false);
    }, 200);
  };
  const ro = new ResizeObserver(rebuild);
  ro.observe(document.body);
  window.addEventListener('resize', rebuild);

  return () => {
    window.clearTimeout(timer);
    ro.disconnect();
    window.removeEventListener('resize', rebuild);
    reduceQuery.removeEventListener('change', onReduce);
    document.removeEventListener('visibilitychange', setIdle);
    trigger.kill();
    intro?.kill();
    idle.kill();
    gsap.killTweensOf(state);
    layer.remove();
    root.classList.remove('has-line');
    geo = null;
  };
}
