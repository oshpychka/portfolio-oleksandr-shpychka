import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  MeshPhysicalMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  Plane,
  Quaternion,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { makeParts, PART_MIX } from './parts';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface SceneOptions {
  container: HTMLElement;
  area: HTMLElement;
  interactive: boolean;
  onCollide?: (strength: number) => void;
  onSlow?: () => void;
}

const PALETTE = ['#2b4bd8', '#2b4bd8', '#0d0d10', '#0d0d10', '#ebe7de', '#2a2160'];

type Body = {
  rest: Vector3;
  pos: Vector3;
  vel: Vector3;
  rot: Quaternion;
  spin: Vector3;
  radius: number;
  scale: number;
  kind: number;
  slot: number;
};

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createHeroScene({ container, area: areaEl, interactive, onCollide, onSlow }: SceneOptions) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTexture = pmrem.fromScene(room, 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.85;

  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(-4, 6, 8);
  scene.add(key);
  const rim = new DirectionalLight(0x8fa8ff, 1.2);
  rim.position.set(6, -2, -4);
  scene.add(rim);

  const camera = new PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 22);

  const parts = makeParts();
  const material = new MeshPhysicalMaterial({ roughness: 0.26, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, side: DoubleSide });

  const desktop = window.matchMedia('(min-width: 861px)').matches;
  const mix = (desktop ? PART_MIX.desktop : PART_MIX.mobile).map((name) => Math.max(0, parts.findIndex((p) => p.name === name)));
  const count = mix.length;
  const slots: number[] = [];
  const perKind = parts.map(() => 0);
  mix.forEach((kind) => {
    slots.push(perKind[kind]);
    perKind[kind] += 1;
  });
  const meshes = parts.map((part, kind) => {
    const m = new InstancedMesh(part.geometry, material, Math.max(1, perKind[kind]));
    m.count = perKind[kind];
    m.instanceMatrix.setUsage(DynamicDrawUsage);
    scene.add(m);
    return m;
  });

  const rand = seeded(7);
  const color = new Color();
  mix.forEach((kind, i) => meshes[kind].setColorAt(slots[i], color.set(PALETTE[Math.floor(rand() * PALETTE.length)])));
  meshes.forEach((m) => {
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  const bodies: Body[] = [];
  let viewW = 1;
  let viewH = 1;
  let ceiling = Infinity;

  const worldAt = (nx: number, ny: number, z = 0) => {
    const dist = camera.position.z - z;
    const h = 2 * Math.tan((camera.fov * Math.PI) / 360) * dist;
    const w = h * camera.aspect;
    return new Vector3((nx - 0.5) * w, (0.5 - ny) * h, z);
  };

  const layout = () => {
    const rect = container.getBoundingClientRect();
    viewW = Math.max(1, rect.width);
    viewH = Math.max(1, rect.height);
    renderer.setSize(viewW, viewH, false);
    camera.aspect = viewW / viewH;
    camera.updateProjectionMatrix();

    const isDesktop = viewW > 860;
    const a = areaEl.getBoundingClientRect();
    const area = {
      x0: (a.left - rect.left) / viewW,
      x1: (a.right - rect.left) / viewW,
      y0: (a.top - rect.top) / viewH,
      y1: (a.bottom - rect.top) / viewH,
    };
    const unit = (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z) / viewH;
    const moduleScale = (isDesktop ? 58 : 38) * unit;
    const marginX = (moduleScale * 0.8) / (unit * viewW);
    const marginY = (moduleScale * 0.8) / (unit * viewH);
    area.x0 += marginX;
    area.x1 = Math.max(area.x0, area.x1 - marginX);
    area.y0 += marginY;
    area.y1 = Math.max(area.y0, area.y1 - marginY);
    ceiling = worldAt(0, (a.top - rect.top) / viewH).y;
    const r2 = seeded(11);
    const placed: Vector3[] = [];
    for (let i = 0; i < count; i++) {
      let p = new Vector3();
      for (let tries = 0; tries < 40; tries++) {
        const z = (r2() - 0.5) * 3;
        p = worldAt(area.x0 + r2() * (area.x1 - area.x0), area.y0 + r2() * (area.y1 - area.y0), z);
        if (placed.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > moduleScale * 1.9)) break;
      }
      placed.push(p);
      const existing = bodies[i];
      const scale = moduleScale * (0.82 + r2() * 0.36);
      const partRadius = parts[mix[i]].radius;
      if (existing) {
        existing.rest.copy(p);
        existing.scale = scale;
        existing.radius = scale * partRadius;
      } else {
        const rot = new Quaternion().setFromAxisAngle(new Vector3(r2() - 0.5, r2() - 0.5, r2() - 0.5).normalize(), r2() * Math.PI * 2);
        bodies.push({
          rest: p.clone(),
          pos: p.clone().add(new Vector3(0, -6 - r2() * 4, 0)),
          vel: new Vector3(),
          rot,
          spin: new Vector3((r2() - 0.5) * 0.3, (r2() - 0.5) * 0.3, (r2() - 0.5) * 0.3),
          radius: scale * partRadius,
          scale,
          kind: mix[i],
          slot: slots[i],
        });
      }
    }
  };

  const matrix = new Matrix4();
  const scaleVec = new Vector3();
  const writeMatrices = () => {
    bodies.forEach((b) => {
      scaleVec.setScalar(b.scale);
      matrix.compose(b.pos, b.rot, scaleVec);
      meshes[b.kind].setMatrixAt(b.slot, matrix);
    });
    meshes.forEach((m) => (m.instanceMatrix.needsUpdate = true));
  };

  const raycaster = new Raycaster();
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  const pointer = new Vector2();
  const pointerWorld = new Vector3();
  const lastPointerWorld = new Vector3();
  let pointerActive = false;
  let pointerSpeed = 0;

  const setPointer = (clientX: number, clientY: number) => {
    const rect = container.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    lastPointerWorld.copy(pointerWorld);
    if (raycaster.ray.intersectPlane(plane, pointerWorld)) {
      if (!pointerActive) lastPointerWorld.copy(pointerWorld);
      pointerSpeed = Math.min(40, pointerWorld.distanceTo(lastPointerWorld) * 60);
      pointerActive = true;
    }
  };

  const onPointerMove = (e: PointerEvent) => setPointer(e.clientX, e.clientY);
  const onPointerLeave = () => (pointerActive = false);
  let lastScroll = scrollY;
  const onScroll = () => {
    const delta = scrollY - lastScroll;
    lastScroll = scrollY;
    const kick = Math.max(-1.2, Math.min(1.2, delta * 0.02));
    bodies.forEach((b, i) => {
      b.vel.y += kick * (0.6 + ((i * 37) % 10) / 20);
      b.spin.x += kick * 0.4;
    });
  };

  if (interactive) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  const tmp = new Vector3();
  const axis = new Vector3();
  const dq = new Quaternion();
  let lastCollide = 0;

  const step = (dt: number, time: number) => {
    const k = 7;
    const damping = 3.2;
    pointerSpeed *= 0.9;
    for (const b of bodies) {
      tmp.subVectors(b.rest, b.pos).multiplyScalar(k);
      b.vel.addScaledVector(tmp, dt);
      b.vel.multiplyScalar(Math.exp(-damping * dt));

      if (pointerActive) {
        tmp.subVectors(b.pos, pointerWorld);
        tmp.z *= 0.5;
        const dist = tmp.length();
        const reach = b.radius * 2.4;
        if (dist < reach && dist > 0.0001) {
          const f = (1 - dist / reach) ** 2 * (22 + pointerSpeed * 1.4);
          tmp.normalize();
          b.vel.addScaledVector(tmp, f * dt);
          axis.set(-tmp.y, tmp.x, 0.3).normalize();
          b.spin.addScaledVector(axis, f * dt * 0.6);
        }
      }

      const over = b.pos.y + b.radius - ceiling;
      if (over > 0) b.vel.y -= over * 60 * dt;

      b.pos.addScaledVector(b.vel, dt);
      b.spin.multiplyScalar(Math.exp(-1.4 * dt));
      const idle = 0.08 + Math.sin(time * 0.3 + b.rest.x) * 0.03;
      axis.copy(b.spin);
      const speed = axis.length() + idle;
      if (axis.lengthSq() < 1e-6) axis.set(0.3, 1, 0.2);
      axis.normalize();
      dq.setFromAxisAngle(axis, speed * dt);
      b.rot.premultiply(dq);
    }

    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const c = bodies[j];
        tmp.subVectors(c.pos, a.pos);
        const dist = tmp.length();
        const min = a.radius + c.radius;
        if (dist >= min || dist < 0.0001) continue;
        tmp.divideScalar(dist);
        const overlap = (min - dist) / 2;
        a.pos.addScaledVector(tmp, -overlap);
        c.pos.addScaledVector(tmp, overlap);
        const approach = a.vel.dot(tmp) - c.vel.dot(tmp);
        if (approach > 0) {
          a.vel.addScaledVector(tmp, -approach * 0.9);
          c.vel.addScaledVector(tmp, approach * 0.9);
          axis.crossVectors(tmp, a.vel).multiplyScalar(0.15);
          a.spin.add(axis);
          c.spin.sub(axis);
          if (approach > 2.2 && time - lastCollide > 0.07) {
            lastCollide = time;
            onCollide?.(Math.min(1, approach / 9));
          }
        }
      }
    }
  };

  let raf = 0;
  let running = false;
  let lastTime = 0;
  let clock = 0;
  let perfFrames = 0;
  let perfStart = 0;
  let firstFrameAt = 0;
  let checkedPerf = false;

  const frame = (now: number) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, lastTime ? (now - lastTime) / 1000 : 0.016);
    lastTime = now;
    clock += dt;
    if (!firstFrameAt) firstFrameAt = now;
    if (!checkedPerf && now - firstFrameAt > 500) {
      if (!perfStart) perfStart = now;
      perfFrames += 1;
      const elapsed = (now - perfStart) / 1000;
      if (elapsed >= 1.2 || perfFrames >= 60) {
        checkedPerf = true;
        if (elapsed / perfFrames > 1 / 32) {
          onSlow?.();
          return;
        }
      }
    }
    step(dt, clock);
    writeMatrices();
    renderer.render(scene, camera);
  };

  const start = () => {
    if (running) return;
    running = true;
    lastTime = 0;
    raf = requestAnimationFrame(frame);
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const renderOnce = (settled = false) => {
    if (settled) bodies.forEach((b) => b.pos.copy(b.rest));
    writeMatrices();
    renderer.render(scene, camera);
  };

  layout();
  writeMatrices();
  const ready = renderer.compileAsync(scene, camera).catch(() => undefined);
  const ro = new ResizeObserver(() => {
    layout();
    if (!running) renderOnce(true);
  });
  ro.observe(container);

  return {
    ready,
    start,
    stop,
    renderOnce,
    get running() {
      return running;
    },
    destroy() {
      stop();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('scroll', onScroll);
      parts.forEach((p) => p.geometry.dispose());
      material.dispose();
      envTexture.dispose();
      pmrem.dispose();
      room.dispose?.();
      meshes.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

export type HeroScene = ReturnType<typeof createHeroScene>;
