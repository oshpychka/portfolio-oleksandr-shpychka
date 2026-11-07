import { gsap } from './gsap';

const VERT = `#version 300 es
in vec2 aPos;
uniform vec2 uVel;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vec2 p = aPos;
  p.x += sin(vUv.y * 3.14159) * uVel.x * 0.22;
  p.y += sin(vUv.x * 3.14159) * uVel.y * 0.22;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uProg;
uniform vec2 uVel;
out vec4 color;
vec4 pick(sampler2D t, vec2 uv) {
  float s = length(uVel) * 0.012;
  return vec4(texture(t, uv + vec2(s, 0.0)).r, texture(t, uv).g, texture(t, uv - vec2(s, 0.0)).b, 1.0);
}
void main() {
  float p = uProg;
  vec2 uvA = vec2(vUv.x, vUv.y + p * 0.3);
  vec2 uvB = vec2(vUv.x, vUv.y - (1.0 - p) * 0.3);
  float m = step(vUv.y, p);
  vec4 a = pick(uA, clamp(uvA, 0.0, 1.0));
  vec4 b = pick(uB, clamp(uvB, 0.0, 1.0));
  color = mix(a, b, m);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
  return sh;
}

function createGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, antialias: true });
  if (!gl) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const n = 24;
  const verts: number[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const x0 = (x / n) * 2 - 1;
      const x1 = ((x + 1) / n) * 2 - 1;
      const y0 = (y / n) * 2 - 1;
      const y1 = ((y + 1) / n) * 2 - 1;
      verts.push(x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1);
    }
  }
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const u = {
    a: gl.getUniformLocation(prog, 'uA'),
    b: gl.getUniformLocation(prog, 'uB'),
    prog: gl.getUniformLocation(prog, 'uProg'),
    vel: gl.getUniformLocation(prog, 'uVel'),
  };
  gl.uniform1i(u.a, 0);
  gl.uniform1i(u.b, 1);

  const textures = new Map<string, WebGLTexture>();
  const texture = (img: HTMLImageElement) => {
    let t = textures.get(img.src);
    if (t) return t;
    t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    textures.set(img.src, t);
    return t;
  };

  return {
    draw(a: HTMLImageElement, b: HTMLImageElement, progress: number, vx: number, vy: number) {
      const w = canvas.clientWidth * Math.min(devicePixelRatio, 2);
      const h = canvas.clientHeight * Math.min(devicePixelRatio, 2);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture(a));
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texture(b));
      gl.uniform1f(u.prog, progress);
      gl.uniform2f(u.vel, vx, vy);
      gl.drawArrays(gl.TRIANGLES, 0, n * n * 6);
    },
    destroy() {
      textures.forEach((t) => gl.deleteTexture(t));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

export function initPreview() {
  const list = document.querySelector<HTMLElement>('[data-preview-list]');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 861px)');
  if (!list || !fine.matches) return () => {};

  const rows = [...list.querySelectorAll<HTMLAnchorElement>('[data-preview]')];
  const images = new Map<string, HTMLImageElement>();
  rows.forEach((row) => {
    const src = row.dataset.preview!;
    if (images.has(src)) return;
    const img = new Image();
    img.decoding = 'async';
    images.set(src, img);
  });
  const loadImages = () => images.forEach((img, src) => {
    if (!img.src) img.src = src;
  });
  const near = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      loadImages();
      near.disconnect();
    }
  }, { rootMargin: '600px 0px' });
  near.observe(list);

  const el = document.createElement('div');
  el.className = 'preview';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="preview__frame"><canvas class="preview__canvas"></canvas><img class="preview__img" alt="" /></div><span class="preview__view mono">View</span>`;
  document.body.appendChild(el);
  const canvas = el.querySelector<HTMLCanvasElement>('canvas')!;
  const fallback = el.querySelector<HTMLImageElement>('.preview__img')!;

  let gl: ReturnType<typeof createGL> = null;
  let glTried = false;
  const ensureGL = () => {
    if (glTried) return;
    glTried = true;
    try {
      gl = createGL(canvas);
    } catch {
      gl = null;
    }
    el.classList.toggle('preview--gl', !!gl);
  };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const smooth = { x: pos.x, y: pos.y };
  const state = { progress: 1, scale: 0 };
  let current: HTMLImageElement | null = null;
  let previous: HTMLImageElement | null = null;
  let active = false;
  let raf = 0;
  let vx = 0;
  let vy = 0;

  const loop = () => {
    raf = 0;
    const lerp = reduce ? 1 : 0.14;
    const nx = smooth.x + (pos.x - smooth.x) * lerp;
    const ny = smooth.y + (pos.y - smooth.y) * lerp;
    vx += ((nx - smooth.x) / 40 - vx) * 0.2;
    vy += ((ny - smooth.y) / 40 - vy) * 0.2;
    smooth.x = nx;
    smooth.y = ny;
    el.style.transform = `translate3d(${smooth.x.toFixed(1)}px, ${smooth.y.toFixed(1)}px, 0) scale(${state.scale.toFixed(3)})`;
    if (gl && current && current.complete) {
      gl.draw(previous && previous.complete ? previous : current, current, state.progress, reduce ? 0 : -vx, reduce ? 0 : vy);
    }
    const moving = Math.abs(pos.x - smooth.x) > 0.3 || Math.abs(pos.y - smooth.y) > 0.3 || Math.abs(vx) + Math.abs(vy) > 0.002;
    if (active || state.scale > 0.001 || moving) raf = requestAnimationFrame(loop);
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const show = (row: HTMLAnchorElement) => {
    const img = images.get(row.dataset.preview!) ?? null;
    if (!img || img === current) return;
    previous = current;
    current = img;
    fallback.src = img.src;
    if (previous && !reduce) {
      gsap.fromTo(state, { progress: 0 }, { progress: 1, duration: 0.7, ease: 'expo.out', overwrite: 'auto', onUpdate: kick });
      if (!gl) gsap.fromTo(fallback, { yPercent: 18 }, { yPercent: 0, duration: 0.6, ease: 'expo.out' });
    } else {
      state.progress = 1;
    }
  };

  const onMove = (e: PointerEvent) => {
    pos.x = e.clientX;
    pos.y = e.clientY;
    if (!active) {
      smooth.x = pos.x;
      smooth.y = pos.y;
    }
    kick();
  };

  const onOver = (e: PointerEvent) => {
    const row = (e.target as Element).closest<HTMLAnchorElement>('[data-preview]');
    if (!row) return;
    ensureGL();
    show(row);
    if (!active) {
      active = true;
      gsap.to(state, { scale: 1, duration: reduce ? 0 : 0.5, ease: 'expo.out', overwrite: 'auto', onUpdate: kick });
    }
    kick();
  };

  const onLeave = () => {
    active = false;
    gsap.to(state, { scale: 0, duration: reduce ? 0 : 0.35, ease: 'power3.in', overwrite: 'auto', onUpdate: kick });
  };

  const onClick = () => onLeave();

  list.addEventListener('pointerover', onOver);
  list.addEventListener('pointerleave', onLeave);
  list.addEventListener('click', onClick);
  window.addEventListener('pointermove', onMove, { passive: true });

  return () => {
    near.disconnect();
    cancelAnimationFrame(raf);
    gsap.killTweensOf(state);
    list.removeEventListener('pointerover', onOver);
    list.removeEventListener('pointerleave', onLeave);
    list.removeEventListener('click', onClick);
    window.removeEventListener('pointermove', onMove);
    gl?.destroy();
    el.remove();
  };
}
