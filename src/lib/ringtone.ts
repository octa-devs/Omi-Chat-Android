/**
 * Tiny WebAudio ringtone + notification blip synthesiser.
 * Avoids shipping audio binaries and works everywhere.
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Two-tone chime, repeated — the classic incoming-call pattern. */
export function playRingtone(enabled: boolean, seconds = 30) {
  const ac = enabled ? audio() : null;
  if (!ac) return () => undefined;
  const ctx = ac;

  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);
  master.gain.setValueAtTime(1, ctx.currentTime);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    clearTimeout(stopAt);
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    setTimeout(() => {
      try {
        master.disconnect();
      } catch {
        /* already detached */
      }
    }, 260);
  };

  const timer = setInterval(() => burst(ctx, master), 2600);
  const stopAt = setTimeout(stop, seconds * 1000);
  burst(ctx, master);

  return stop;
}

function burst(ac: AudioContext, out: GainNode) {
  const now = ac.currentTime;
  const notes = [
    { f: 880, at: 0 },
    { f: 1174.66, at: 0.16 },
    { f: 880, at: 0.4 },
    { f: 1174.66, at: 0.56 },
  ];
  for (const { f, at } of notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.28, now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.14);
    osc.connect(gain).connect(out);
    osc.start(now + at);
    osc.stop(now + at + 0.18);
  }
}

/** Soft two-note "message received" chime. */
export function playMessageChime(enabled: boolean) {
  const ac = enabled ? audio() : null;
  if (!ac) return;
  const now = ac.currentTime;
  [
    { f: 659.25, at: 0 },
    { f: 987.77, at: 0.09 },
  ].forEach(({ f, at }) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.16, now + at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.3);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.34);
  });
}

/** Short descending "call ended" tone. */
export function playEndTone() {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(190, now + 0.35);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.45);
}

/** Mechanical click for UI confirmations. */
export function playClick(enabled = true) {
  const ac = enabled ? audio() : null;
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(1400, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}