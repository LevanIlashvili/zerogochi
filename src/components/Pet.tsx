"use client";

import { useEffect, useRef, useState } from "react";
import { Device } from "./Device";
import { StatBars } from "./StatBars";
import { Buttons, type ButtonKind } from "./Buttons";
import { AnimatedSprite, type AnimatedSpriteHandle } from "@/sprite/AnimatedSprite";
import { lookFromSeed } from "@/sprite/types";
import { statFromValues } from "@/sprite/states";
import { BEEPS } from "@/lib/beep";

interface Stats {
  hunger: number;
  mood: number;
  energy: number;
}

const INITIAL: Stats = { hunger: 80, mood: 65, energy: 90 };

export function Pet() {
  const [seed, setSeed] = useState(142);
  const look = lookFromSeed(seed);
  const [stats, setStats] = useState<Stats>(INITIAL);
  const [bornAt] = useState(() => Date.now() - 1000 * 60 * 60 * 24 * 3);
  const [booting, setBooting] = useState(true);
  const [bootStep, setBootStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const spriteRef = useRef<AnimatedSpriteHandle | null>(null);
  const state = statFromValues(stats.hunger, stats.mood, stats.energy);
  const ageDays = Math.floor((Date.now() - bornAt) / (1000 * 60 * 60 * 24));

  // Boot sequence
  useEffect(() => {
    const t1 = window.setTimeout(() => setBootStep(1), 280);
    const t2 = window.setTimeout(() => setBootStep(2), 700);
    const t3 = window.setTimeout(() => setBooting(false), 1300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  // Gentle decay
  useEffect(() => {
    const id = window.setInterval(() => {
      setStats((s) => ({
        hunger: Math.max(0, s.hunger - 1),
        mood: Math.max(0, s.mood - 1),
        energy: Math.max(0, s.energy - 1),
      }));
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  async function handle(kind: ButtonKind) {
    if (busy || booting) return;
    setBusy(true);
    try {
      if (kind === "A") {
        BEEPS.btnA();
        window.setTimeout(BEEPS.eat, 100);
        await spriteRef.current?.triggerAction("eating");
        spriteRef.current?.triggerReaction("heart");
        setStats((s) => ({ ...s, hunger: Math.min(100, s.hunger + 25) }));
      } else if (kind === "B") {
        BEEPS.btnB();
        window.setTimeout(BEEPS.play, 100);
        await spriteRef.current?.triggerAction("playing");
        spriteRef.current?.triggerReaction("star");
        setStats((s) => ({
          ...s,
          mood: Math.min(100, s.mood + 25),
          energy: Math.max(0, s.energy - 5),
        }));
      } else {
        BEEPS.btnC();
        await spriteRef.current?.triggerAction("talking");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Device
        controls={<Buttons onPress={handle} disabled={busy || booting} />}
        footer={
          <>
            <div>@username</div>
            <div>0x4f3...a82b</div>
          </>
        }
      >
        {booting ? (
          <BootScreen step={bootStep} />
        ) : (
          <>
            <StatBars {...stats} />
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
              <AnimatedSprite ref={spriteRef} look={look} state={state} scale={8} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 6,
                color: "var(--gb-darkest)",
                marginTop: 8,
              }}
            >
              <span>#{String(seed).padStart(4, "0")}</span>
              <span>{ageDays}d</span>
            </div>
          </>
        )}
      </Device>

      <div
        style={{
          marginTop: 18,
          fontSize: 8,
          color: "#666",
          textAlign: "center",
          fontFamily: "monospace",
        }}
      >
        <div>seed: {seed}</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 6 }}>
          {[7, 42, 99, 142, 200, 255].map((s) => (
            <button
              key={s}
              onClick={() => setSeed(s)}
              style={{
                background: s === seed ? "#444" : "#222",
                color: "#aaa",
                border: "1px solid #444",
                padding: "2px 6px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 8,
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 6 }}>
          {[
            { l: "happy", s: { hunger: 90, mood: 90, energy: 90 } },
            { l: "sad", s: { hunger: 30, mood: 30, energy: 60 } },
            { l: "crit", s: { hunger: 10, mood: 10, energy: 10 } },
            { l: "dead", s: { hunger: 0, mood: 0, energy: 0 } },
          ].map(({ l, s }) => (
            <button
              key={l}
              onClick={() => setStats(s)}
              style={{
                background: "#222",
                color: "#aaa",
                border: "1px solid #444",
                padding: "2px 6px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 8,
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function BootScreen({ step }: { step: 0 | 1 | 2 | number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 240,
        gap: 12,
        color: "var(--gb-darkest)",
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: 2 }}>
        {step === 0 ? "" : "ZEROGOCHI"}
      </div>
      <div style={{ fontSize: 6, letterSpacing: 1, height: 12 }}>
        {step === 1 ? "* * *" : step >= 2 ? "READY" : ""}
      </div>
    </div>
  );
}
