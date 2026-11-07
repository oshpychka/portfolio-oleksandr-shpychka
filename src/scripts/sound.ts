type Group = 'ambient' | 'ui' | 'fx';
type Pref = 'on' | 'off' | null;

const KEY = 'os-sound';
const LEVELS: Record<Group, number> = { ambient: 0.05, ui: 0.11, fx: 0.16 };
const MASTER = 0.9;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let groups: Record<Group, GainNode> | null = null;
let ambientNodes: AudioScheduledSourceNode[] = [];
let ambientOut: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let enabled = false;
let lastTick = 0;
const listeners = new Set<(on: boolean) => void>();

export function readPref(): Pref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'on' || v === 'off' ? v : null;
  } catch {
    return null;
  }
}

function writePref(value: 'on' | 'off') {
  try {
    localStorage.setItem(KEY, value);
  } catch {}
}

function ensureContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  master.connect(comp).connect(ctx.destination);
  groups = {
    ambient: ctx.createGain(),
    ui: ctx.createGain(),
    fx: ctx.createGain(),
  };
  (Object.keys(groups) as Group[]).forEach((g) => {
    groups![g].gain.value = LEVELS[g];
    groups![g].connect(master!);
  });
  const length = ctx.sampleRate * 0.5;
  noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

function fadeMaster(to: number, time = 0.6) {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(to, now + time);
}

function startAmbient() {
  if (!ctx || !groups || ambientNodes.length) return;
  const now = ctx.currentTime;
  ambientOut = ctx.createGain();
  ambientOut.gain.setValueAtTime(0, now);
  ambientOut.gain.linearRampToValueAtTime(1, now + 4);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 520;
  filter.Q.value = 0.6;
  ambientOut.connect(filter).connect(groups.ambient);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.06;
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start(now);
  ambientNodes.push(lfo);

  const breath = ctx.createOscillator();
  const breathGain = ctx.createGain();
  breath.frequency.value = 0.11;
  breathGain.gain.value = 0.25;
  breath.connect(breathGain).connect(ambientOut.gain);
  breath.start(now);
  ambientNodes.push(breath);

  [
    [110, 'triangle', 0],
    [164.81, 'sine', 4],
    [220, 'sine', -5],
    [246.94, 'triangle', 6],
    [329.63, 'sine', -3],
  ].forEach(([freq, type, detune]) => {
    const osc = ctx!.createOscillator();
    const g = ctx!.createGain();
    osc.type = type as OscillatorType;
    osc.frequency.value = freq as number;
    osc.detune.value = detune as number;
    g.gain.value = (freq as number) < 150 ? 0.5 : 0.22;
    osc.connect(g).connect(ambientOut!);
    osc.start(now);
    ambientNodes.push(osc);
  });
}

function stopAmbient() {
  if (!ctx || !ambientOut) return;
  const nodes = ambientNodes;
  const out = ambientOut;
  const now = ctx.currentTime;
  out.gain.cancelScheduledValues(now);
  out.gain.setValueAtTime(out.gain.value, now);
  out.gain.linearRampToValueAtTime(0, now + 0.8);
  nodes.forEach((n) => n.stop(now + 0.9));
  ambientNodes = [];
  ambientOut = null;
}

function tone(group: Group, opts: { freq: number; to?: number; type?: OscillatorType; dur: number; gain: number; attack?: number; delay?: number }) {
  if (!ctx || !groups) return;
  const t = ctx.currentTime + (opts.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, t);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + opts.dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain, t + (opts.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  osc.connect(g).connect(groups[group]);
  osc.start(t);
  osc.stop(t + opts.dur + 0.02);
}

function noise(group: Group, opts: { freq: number; q: number; dur: number; gain: number; delay?: number }) {
  if (!ctx || !groups || !noiseBuffer) return;
  const t = ctx.currentTime + (opts.delay ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = opts.freq;
  bp.Q.value = opts.q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(opts.gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  src.connect(bp).connect(g).connect(groups[group]);
  src.start(t, Math.random() * 0.3);
  src.stop(t + opts.dur + 0.02);
}

const sounds = {
  tick: () => {
    const now = performance.now();
    if (now - lastTick < 45) return;
    lastTick = now;
    tone('ui', { freq: 2100 + Math.random() * 500, type: 'sine', dur: 0.035, gain: 0.5 });
  },
  click: () => {
    noise('ui', { freq: 3200, q: 1.2, dur: 0.03, gain: 0.7 });
    tone('ui', { freq: 160, to: 90, dur: 0.07, gain: 0.6 });
  },
  node: () => {
    tone('fx', { freq: 1320, to: 1760, dur: 0.16, gain: 0.35, attack: 0.006 });
    tone('fx', { freq: 2640, dur: 0.09, gain: 0.08, delay: 0.02 });
  },
  collide: (strength = 0.5) => {
    const s = Math.max(0.1, Math.min(1, strength));
    tone('fx', { freq: 180 + Math.random() * 90, to: 110, type: 'triangle', dur: 0.12, gain: 0.5 * s });
    noise('fx', { freq: 1400 + Math.random() * 900, q: 3, dur: 0.05, gain: 0.35 * s });
  },
  copy: () => {
    tone('ui', { freq: 880, dur: 0.08, gain: 0.4 });
    tone('ui', { freq: 1320, dur: 0.12, gain: 0.4, delay: 0.07 });
  },
  enter: () => {
    [220, 277.18, 329.63, 440].forEach((f, i) => tone('fx', { freq: f, type: 'sine', dur: 1.4, gain: 0.18, attack: 0.25, delay: i * 0.06 }));
    noise('fx', { freq: 5000, q: 0.7, dur: 0.6, gain: 0.08 });
  },
};

export type SoundName = keyof typeof sounds;

export function play(name: SoundName, arg?: number) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  (sounds[name] as (a?: number) => void)(arg);
}

export const isSoundOn = () => enabled;

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  document.documentElement.classList.toggle('sound-on', enabled);
  listeners.forEach((fn) => fn(enabled));
}

export function enableSound(remember = true) {
  const c = ensureContext();
  if (!c) return false;
  c.resume();
  enabled = true;
  if (remember) writePref('on');
  if (!document.hidden) fadeMaster(MASTER, 0.8);
  startAmbient();
  emit();
  return true;
}

export function disableSound(remember = true) {
  enabled = false;
  if (remember) writePref('off');
  fadeMaster(0, 0.4);
  stopAmbient();
  emit();
}

export function toggleSound() {
  if (enabled) disableSound();
  else enableSound();
}

let wired = false;

export function initSoundGlobal() {
  if (wired) return;
  wired = true;
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !enabled) return;
    if (document.hidden) fadeMaster(0, 0.4);
    else {
      ctx.resume();
      fadeMaster(MASTER, 0.8);
    }
  });
}

export function armSoundOnFirstGesture() {
  const start = () => {
    window.removeEventListener('pointerdown', start, true);
    window.removeEventListener('keydown', start, true);
    if (readPref() === 'on' && !enabled) enableSound(false);
  };
  window.addEventListener('pointerdown', start, true);
  window.addEventListener('keydown', start, true);
}
