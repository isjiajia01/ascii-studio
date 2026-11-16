/** Interface sounds, synthesised with Web Audio (no audio files). Off by default; the visitor turns them on and the choice is remembered. */
const KEY = 'ascii-studio-sound';
let ctx: AudioContext | null = null;
let on = false;
try { on = localStorage.getItem(KEY) === '1'; } catch { /* storage blocked: stay off */ }

function ac(): AudioContext | null {
  if (!on) return null;
  const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  ctx ||= new C();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}
/** One soft tone: sine with a quick attack and exponential decay. */
function tone(freq: number, at: number, len: number, vol: number, to = freq) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(to, t + len);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + len + 0.02);
}
export const sound = {
  get enabled() { return on; },
  set(v: boolean) { on = v; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* ignore */ } if (v) this.tick(); },
  /** a choice was made (style, preset, palette) */
  tick() { tone(1250, 0, 0.05, 0.05, 900); },
  /** a picture or video was loaded */
  load() { tone(520, 0, 0.12, 0.06); tone(780, 0.07, 0.14, 0.05); },
  /** an export finished */
  done() { tone(660, 0, 0.14, 0.06); tone(880, 0.1, 0.14, 0.06); tone(1320, 0.2, 0.28, 0.05); },
  /** an export failed */
  fail() { tone(300, 0, 0.22, 0.06, 200); },
};
