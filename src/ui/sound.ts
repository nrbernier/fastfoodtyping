// Diner sound effects, synthesized with Web Audio so there are no files to
// load: typewriter clacks, a buzz for a wrong key, a plop and sizzle when a
// word lands in the pot, the service bell, the register, a walkout grumble.

type Cue = 'key' | 'mistake' | 'plop' | 'bell' | 'register' | 'grumble' | 'lid' | 'coin' | 'rush' | 'cheer';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let noise: AudioBuffer | null = null;

/** Create (or wake) the audio context; browsers only allow this after a tap or key. */
function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Call from the first tap or key so later sounds can play. */
export function unlockAudio(): void {
  audio();
}

export function setMuted(m: boolean): void {
  muted = m;
}

export function isMuted(): boolean {
  return muted;
}

/** A tone with a quick attack and exponential decay. */
function tone(type: OscillatorType, freq: number, start: number, dur: number, gain: number, endFreq?: number) {
  const c = ctx!;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(master!);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Filtered noise: clicks, sizzles, the register drawer. */
function hiss(start: number, dur: number, gain: number, filter: BiquadFilterType, freq: number) {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(start, Math.random() * 0.5);
  src.stop(start + dur + 0.02);
}

export function play(cue: Cue): void {
  if (muted) return;
  const c = audio();
  if (!c || !master || c.state !== 'running') return;
  const t = c.currentTime;
  switch (cue) {
    case 'key':
      hiss(t, 0.025, 0.35, 'highpass', 2500 + Math.random() * 1500);
      tone('square', 180 + Math.random() * 40, t, 0.02, 0.04);
      break;
    case 'mistake':
      tone('square', 110, t, 0.14, 0.12, 90);
      tone('square', 116, t, 0.14, 0.08, 95);
      break;
    case 'plop':
      tone('sine', 420, t, 0.16, 0.3, 110);
      hiss(t + 0.08, 0.35, 0.08, 'bandpass', 4000);
      break;
    case 'bell':
      tone('sine', 1318, t, 0.9, 0.22);
      tone('sine', 2637, t, 0.5, 0.08);
      tone('sine', 1975, t, 0.6, 0.05);
      break;
    case 'register':
      hiss(t, 0.12, 0.25, 'bandpass', 1800);
      tone('triangle', 1568, t + 0.1, 0.25, 0.12);
      tone('triangle', 2093, t + 0.18, 0.4, 0.12);
      break;
    case 'grumble':
      tone('sawtooth', 160, t, 0.45, 0.1, 70);
      tone('sawtooth', 120, t + 0.05, 0.45, 0.07, 60);
      break;
    case 'lid':
      tone('triangle', 2400, t, 0.35, 0.08, 2200);
      hiss(t, 0.3, 0.06, 'highpass', 3000);
      break;
    case 'coin':
      tone('square', 988, t, 0.07, 0.06);
      tone('square', 1319, t + 0.07, 0.18, 0.06);
      break;
    case 'rush':
      [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, t + i * 0.09, 0.25, 0.14));
      break;
    case 'cheer':
      [784, 988, 1175].forEach((f, i) => tone('sine', f, t + i * 0.06, 0.3, 0.1));
      break;
  }
}
