"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Sprite, type Action } from "./Sprite";
import type { SpriteLook, PetState } from "./types";

interface Props {
  look: SpriteLook;
  state?: PetState;
  scale?: number;
  /** frames per second — Tamagotchi feel = 2 */
  fps?: number;
}

export interface AnimatedSpriteHandle {
  triggerAction: (action: "eating" | "playing" | "talking") => Promise<void>;
  triggerReaction: (kind: "heart" | "star") => void;
}

export const AnimatedSprite = forwardRef<AnimatedSpriteHandle, Props>(function AnimatedSprite(
  { look, state = "content", scale = 6, fps = 2 },
  ref,
) {
  const [frame, setFrame] = useState<0 | 1>(0);
  const [action, setAction] = useState<Action>("idle");
  const [actionFrame, setActionFrame] = useState<0 | 1 | 2 | 3>(0);
  const [reaction, setReaction] = useState<"heart" | "star" | null>(null);
  const [reactionY, setReactionY] = useState(0);
  const [idleMicro, setIdleMicro] = useState<0 | 1 | 2 | 3>(0);
  const microTimer = useRef<number | null>(null);

  // Base 2 FPS body breathing animation
  useEffect(() => {
    if (state === "dead") return;
    const id = window.setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 1000 / fps);
    return () => window.clearInterval(id);
  }, [fps, state]);

  // Idle micro-animations: every 3-7s, blink or look around briefly
  useEffect(() => {
    if (state === "dead" || action !== "idle") return;
    function scheduleNext() {
      const wait = 3000 + Math.random() * 4000;
      microTimer.current = window.setTimeout(() => {
        const choices: (1 | 2 | 3)[] = [1, 1, 1, 2, 3]; // blink most often
        const pick = choices[Math.floor(Math.random() * choices.length)];
        setIdleMicro(pick);
        window.setTimeout(() => {
          setIdleMicro(0);
          scheduleNext();
        }, pick === 1 ? 180 : 350);
      }, wait);
    }
    scheduleNext();
    return () => {
      if (microTimer.current) window.clearTimeout(microTimer.current);
    };
  }, [state, action]);

  useImperativeHandle(ref, () => ({
    triggerAction: (kind) =>
      new Promise<void>((resolve) => {
        setAction(kind);
        setActionFrame(0);
        // 4 frames at 220ms each
        let i = 0;
        const tick = window.setInterval(() => {
          i += 1;
          if (i > 3) {
            window.clearInterval(tick);
            setAction("idle");
            setActionFrame(0);
            resolve();
            return;
          }
          setActionFrame(i as 0 | 1 | 2 | 3);
        }, 220);
      }),
    triggerReaction: (kind) => {
      setReaction(kind);
      setReactionY(0);
      // float up over 800ms
      const start = performance.now();
      const dur = 900;
      const animate = (t: number) => {
        const elapsed = t - start;
        const progress = Math.min(1, elapsed / dur);
        setReactionY(-progress * 6);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setReaction(null);
        }
      };
      requestAnimationFrame(animate);
    },
  }));

  return (
    <Sprite
      look={look}
      state={state}
      frame={frame}
      scale={scale}
      action={action}
      actionFrame={actionFrame}
      reaction={reaction}
      reactionY={reactionY}
      idleMicro={idleMicro}
    />
  );
});
