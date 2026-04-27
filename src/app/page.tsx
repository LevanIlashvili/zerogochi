import { Device } from "@/components/Device";
import { AnimatedSprite } from "@/sprite/AnimatedSprite";
import { lookFromSeed } from "@/sprite/types";

export default function Page() {
  const look = lookFromSeed(142);
  return (
    <main>
      <Device>
        <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
          <AnimatedSprite look={look} state="happy" scale={6} />
        </div>
      </Device>
    </main>
  );
}
