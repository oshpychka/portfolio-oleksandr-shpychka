import Matter from 'matter-js';

const { Engine, Bodies, Body, Composite, Constraint, Events } = Matter;

export interface StackPhysicsOptions {
  area: HTMLElement;
  words: HTMLElement[];
  onCollide?: (strength: number) => void;
}

export function createStackPhysics({ area, words, onCollide }: StackPhysicsOptions) {
  const engine = Engine.create({ gravity: { x: 0, y: 1.1, scale: 0.001 } });
  const world = engine.world;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  let width = area.clientWidth;
  let height = area.clientHeight;
  let walls: Matter.Body[] = [];
  const sizes = words.map((w) => ({ w: w.offsetWidth, h: w.offsetHeight }));

  const makeWalls = () => {
    if (walls.length) Composite.remove(world, walls);
    const t = 400;
    walls = [
      Bodies.rectangle(width / 2, height + t / 2, width + t * 2, t, { isStatic: true }),
      Bodies.rectangle(-t / 2, height / 2 - 2000, t, height + 4000, { isStatic: true }),
      Bodies.rectangle(width + t / 2, height / 2 - 2000, t, height + 4000, { isStatic: true }),
      Bodies.rectangle(width / 2, -2400, width + t * 2, t, { isStatic: true }),
    ];
    Composite.add(world, walls);
  };
  makeWalls();

  const bodies = words.map((_, i) => {
    const { w, h } = sizes[i];
    const x = w / 2 + Math.random() * Math.max(1, width - w);
    const y = -h - i * (h * 0.9) - Math.random() * 120;
    return Bodies.rectangle(x, y, w, h, {
      chamfer: { radius: h / 2 - 1 },
      restitution: 0.32,
      friction: 0.08,
      frictionAir: 0.012,
      density: 0.0018,
      angle: (Math.random() - 0.5) * 0.6,
    });
  });
  Composite.add(world, bodies);

  const pusher = Bodies.circle(-9999, -9999, 26, { isStatic: true, label: 'pusher' });
  if (fine) Composite.add(world, pusher);

  words.forEach((w) => {
    w.style.position = 'absolute';
    w.style.left = '0';
    w.style.top = '0';
    w.style.willChange = 'transform';
    w.style.touchAction = 'none';
  });
  area.classList.add('is-physics');

  const render = () => {
    bodies.forEach((b, i) => {
      const { w, h } = sizes[i];
      words[i].style.transform = `translate3d(${(b.position.x - w / 2).toFixed(1)}px, ${(b.position.y - h / 2).toFixed(1)}px, 0) rotate(${b.angle.toFixed(4)}rad)`;
    });
  };

  let lastSound = 0;
  Events.on(engine, 'collisionStart', (event) => {
    const now = performance.now();
    if (now - lastSound < 70) return;
    let best = 0;
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const speed = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
      best = Math.max(best, speed);
    }
    if (best > 4) {
      lastSound = now;
      onCollide?.(Math.min(1, best / 18));
    }
  });

  let grab: Matter.Constraint | null = null;
  let grabId = -1;
  const local = (e: PointerEvent) => {
    const r = area.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: PointerEvent) => {
    const i = words.indexOf((e.target as HTMLElement).closest('[data-physics-body]') as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    const p = local(e);
    const body = bodies[i];
    grab = Constraint.create({
      pointA: p,
      bodyB: body,
      pointB: { x: p.x - body.position.x, y: p.y - body.position.y },
      stiffness: 0.18,
      damping: 0.08,
      length: 0,
    });
    Composite.add(world, grab);
    grabId = e.pointerId;
    words[i].setPointerCapture(e.pointerId);
    area.classList.add('is-grabbing');
  };

  let lastPointer: { x: number; y: number } | null = null;
  const onMove = (e: PointerEvent) => {
    const p = local(e);
    if (grab && e.pointerId === grabId) grab.pointA = p;
    if (fine && !grab) {
      const prev = lastPointer ?? p;
      Body.setPosition(pusher, p);
      Body.setVelocity(pusher, { x: (p.x - prev.x) * 0.6, y: (p.y - prev.y) * 0.6 });
    }
    lastPointer = p;
  };

  const release = (e: PointerEvent) => {
    if (!grab || e.pointerId !== grabId) return;
    Composite.remove(world, grab);
    grab = null;
    grabId = -1;
    area.classList.remove('is-grabbing');
  };

  const onLeave = () => {
    lastPointer = null;
    Body.setPosition(pusher, { x: -9999, y: -9999 });
  };

  area.addEventListener('pointerdown', onDown);
  area.addEventListener('pointermove', onMove);
  area.addEventListener('pointerup', release);
  area.addEventListener('pointercancel', release);
  area.addEventListener('pointerleave', onLeave);

  let raf = 0;
  let last = 0;
  let running = false;
  const frame = (now: number) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(32, last ? now - last : 16.7);
    last = now;
    const held = grab?.bodyB ?? null;
    bodies.forEach((b) => {
      if (b === held) return;
      const upright = Math.sin(b.angle);
      Body.setAngularVelocity(b, b.angularVelocity * 0.985 - upright * 0.0035 * (dt / 16.7));
    });
    Engine.update(engine, dt);
    bodies.forEach((b) => {
      if (b.position.y > height + 200 || b.position.x < -200 || b.position.x > width + 200) {
        Body.setPosition(b, { x: width / 2, y: -100 });
        Body.setVelocity(b, { x: 0, y: 0 });
      }
    });
    render();
  };

  const resize = () => {
    const w = area.clientWidth;
    const h = area.clientHeight;
    if (w === width && h === height) return;
    width = w;
    height = h;
    makeWalls();
    bodies.forEach((b, i) => {
      const half = sizes[i].w / 2;
      if (b.position.x > width - half) Body.setPosition(b, { x: width - half, y: b.position.y });
    });
  };
  const ro = new ResizeObserver(resize);
  ro.observe(area);

  render();

  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      area.removeEventListener('pointerdown', onDown);
      area.removeEventListener('pointermove', onMove);
      area.removeEventListener('pointerup', release);
      area.removeEventListener('pointercancel', release);
      area.removeEventListener('pointerleave', onLeave);
      Events.off(engine, 'collisionStart');
      Composite.clear(world, false);
      Engine.clear(engine);
      words.forEach((w) => {
        w.style.position = '';
        w.style.left = '';
        w.style.top = '';
        w.style.transform = '';
        w.style.willChange = '';
        w.style.touchAction = '';
      });
      area.classList.remove('is-physics', 'is-grabbing');
    },
  };
}

export type StackPhysics = ReturnType<typeof createStackPhysics>;
