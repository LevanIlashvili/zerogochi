"use client";

import { useEffect, useState } from "react";
import { Sprite } from "./Sprite";
import type { SpriteLook, PetState } from "./types";

interface Props {
  look: SpriteLook;
  state?: PetState;
  scale?: number;
  /** frames per second — Tamagotchi feel = 2 */
  fps?: number;
}

export function AnimatedSprite({ look, state = "content", scale = 6, fps = 2 }: Props) {
  const [frame, setFrame] = useState<0 | 1>(0);
  useEffect(() => {
    if (state === "dead") return;
    const interval = window.setInterval(() => {
      setFrame((f) => (f === 0 ? 1 : 0));
    }, 1000 / fps);
    return () => window.clearInterval(interval);
  }, [fps, state]);
  return <Sprite look={look} state={state} frame={frame} scale={scale} />;
}
