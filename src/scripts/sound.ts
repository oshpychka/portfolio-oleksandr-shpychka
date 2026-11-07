type Group = 'ambient' | 'ui' | 'fx';
type Pref = 'on' | 'off' | null;

const KEY = 'os-sound';
const LEVELS: Record<Group, number> = { ambient: 0.22, ui: 0.11, fx: 0.16 };
const MASTER = 0.9;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let groups: Record<Group, GainNode> | null = null;
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

const CHORDS = [
  [110, 164.81, 196, 246.94, 261.63],
  [87.31, 130.81, 164.81, 220, 261.63],
  [130.81, 196, 246.94, 293.66, 329.63],
  [98, 146.83, 220, 246.94, 293.66],
];
const BELLS = [440, 523.25, 587.33, 659.25, 783.99, 880];
const CHORD_LEN = 8;
const LOOKAHEAD = 2.5;

type Music = { timer: number; nextChord: number; nextBell: number; chord: number; bus: GainNode; delay: DelayNode; voices: Array<{ osc: OscillatorNode[]; gain: GainNode }> };
let music: Music | null = null;

function scheduleChord(at: number, freqs: number[]) {
  if (!ctx || !music) return;
  const m = music;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(1, at + 3);
  gain.gain.setValueAtTime(1, at + CHORD_LEN);
  gain.gain.linearRampToValueAtTime(0.0001, at + CHORD_LEN + 3.5);
  gain.connect(m.bus);
  const osc: OscillatorNode[] = [];
  freqs.forEach((f, i) => {
    [
      [f, 'triangle', -6, i === 0 ? 0.32 : 0.16],
      [f, 'sine', 7, i === 0 ? 0.3 : 0.14],
      [f * 2, 'sine', 3, 0.035],
    ].forEach(([freq, type, detune, level]) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = type as OscillatorType;
      o.frequency.value = freq as number;
      o.detune.value = detune as number;
      g.gain.value = level as number;
      o.connect(g).connect(gain);
      o.start(at);
      o.stop(at + CHORD_LEN + 4);
      osc.push(o);
    });
  });
  m.voices.push({ osc, gain });
  osc[0].onended = () => {
    gain.disconnect();
    m.voices = m.voices.filter((v) => v.gain !== gain);
  };
}

function scheduleBell(at: number) {
  if (!ctx || !music) return;
  const m = music;
  const f = BELLS[Math.floor(Math.random() * BELLS.length)];
  [
    [f, 'sine', 0.22, 2.6],
    [f * 2.01, 'sine', 0.05, 1.2],
    [f * 3, 'triangle', 0.015, 0.6],
  ].forEach(([freq, type, level, dur]) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = type as OscillatorType;
    o.frequency.value = freq as number;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(level as number, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + (dur as number));
    o.connect(g);
    g.connect(m.bus);
    g.connect(m.delay);
    o.start(at);
    o.stop(at + (dur as number) + 0.05);
  });
}

function pump() {
  if (!ctx || !music) return;
  const horizon = ctx.currentTime + LOOKAHEAD;
  while (music.nextChord < horizon) {
    scheduleChord(music.nextChord, CHORDS[music.chord % CHORDS.length]);
    music.chord += 1;
    music.nextChord += CHORD_LEN;
  }
  while (music.nextBell < horizon) {
    scheduleBell(music.nextBell);
    music.nextBell += 1.6 + Math.random() * 3.2;
  }
  music.timer = window.setTimeout(pump, 1000);
}

function startAmbient() {
  if (!ctx || !groups || music) return;
  const now = ctx.currentTime;
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, now);
  bus.gain.linearRampToValueAtTime(1, now + 3);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  filter.Q.value = 0.4;
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.38;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(filter);
  bus.connect(filter).connect(groups.ambient);
  music = { timer: 0, nextChord: now + 0.05, nextBell: now + 2.5, chord: 0, bus, delay, voices: [] };
  pump();
}

function stopAmbient() {
  if (!ctx || !music) return;
  const m = music;
  music = null;
  window.clearTimeout(m.timer);
  const now = ctx.currentTime;
  m.bus.gain.cancelScheduledValues(now);
  m.bus.gain.setValueAtTime(m.bus.gain.value, now);
  m.bus.gain.linearRampToValueAtTime(0.0001, now + 0.8);
  m.voices.forEach((v) => v.osc.forEach((o) => o.stop(now + 0.9)));
  window.setTimeout(() => m.bus.disconnect(), 1200);
}

function pauseMusic(paused: boolean) {
  if (!music || !ctx) return;
  window.clearTimeout(music.timer);
  if (!paused) {
    music.nextChord = Math.max(music.nextChord, ctx.currentTime + 0.1);
    music.nextBell = Math.max(music.nextBell, ctx.currentTime + 1);
    pump();
  }
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
    if (document.hidden) {
      fadeMaster(0, 0.4);
      pauseMusic(true);
    } else {
      ctx.resume();
      fadeMaster(MASTER, 0.8);
      pauseMusic(false);
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
