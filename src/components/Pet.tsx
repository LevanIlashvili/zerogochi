"use client";

import { useState } from "react";
import { Device } from "./Device";
import { StatBars } from "./StatBars";
import { Buttons, type ButtonKind } from "./Buttons";
import { AnimatedSprite } from "@/sprite/AnimatedSprite";
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
  const look = lookFromSeed(142);
  const [stats, setStats] = useState<Stats>(INITIAL);
  const state = statFromValues(stats.hunger, stats.mood, stats.energy);

  function handle(kind: ButtonKind) {
    if (kind === "A") {
      BEEPS.btnA();
      window.setTimeout(BEEPS.eat, 100);
      setStats((s) => ({ ...s, hunger: Math.min(100, s.hunger + 25) }));
    } else if (kind === "B") {
      BEEPS.btnB();
      window.setTimeout(BEEPS.play, 100);
      setStats((s) => ({
        ...s,
        mood: Math.min(100, s.mood + 25),
        energy: Math.max(0, s.energy - 5),
      }));
    } else {
      BEEPS.btnC();
    }
  }

  return (
    <Device
      controls={<Buttons onPress={handle} />}
      footer={
        <>
          <div>@username</div>
          <div>0x4f3...a82b</div>
        </>
      }
    >
      <StatBars {...stats} />
      <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
        <AnimatedSprite look={look} state={state} scale={6} />
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
        <span>#0142</span>
        <span>3d</span>
      </div>
    </Device>
  );
}
