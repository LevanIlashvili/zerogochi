import { Device } from "@/components/Device";
import { StatBars } from "@/components/StatBars";
import { AnimatedSprite } from "@/sprite/AnimatedSprite";
import { lookFromSeed } from "@/sprite/types";
import { statFromValues } from "@/sprite/states";

export default function Page() {
  const look = lookFromSeed(142);
  const stats = { hunger: 80, mood: 65, energy: 90 };
  const state = statFromValues(stats.hunger, stats.mood, stats.energy);

  return (
    <main>
      <Device>
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
    </main>
  );
}
