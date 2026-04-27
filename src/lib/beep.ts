"use client";

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

interface BeepOpts {
  freq: number;
  /** duration in ms */
  dur: number;
  /** optional ending freq for a slide */
  slide?: number;
  /** square wave volume 0..1 */
  volume?: number;
}

export function beep({ freq, dur, slide, volume = 0.06 }: BeepOpts) {
  const c = context();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slide !== undefined) {
    osc.frequency.linearRampToValueAtTime(slide, c.currentTime + dur / 1000);
  }
  // tight envelope - fast attack, fast release
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + 0.005);
  gain.gain.linearRampToValueAtTime(0, c.currentTime + dur / 1000);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + dur / 1000 + 0.01);
}

export const BEEPS = {
  btnA: () => beep({ freq: 660, dur: 80 }),
  btnB: () => beep({ freq: 880, dur: 80 }),
  btnC: () => beep({ freq: 1100, dur: 80 }),
  eat: () => {
    beep({ freq: 440, dur: 60 });
    window.setTimeout(() => beep({ freq: 440, dur: 60 }), 80);
    window.setTimeout(() => beep({ freq: 440, dur: 60 }), 160);
  },
  play: () => beep({ freq: 550, dur: 100, slide: 700 }),
  talk: () => beep({ freq: 1320, dur: 30, volume: 0.04 }),
};
