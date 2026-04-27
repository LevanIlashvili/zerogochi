import type { PetState } from "./types";

export interface StateMod {
  /** vertical pixel offset (negative = up bounce) */
  yOffset: number;
  /** eye override — show closed line eyes when sad/critical */
  eyeOverride?: "closed" | "x" | null;
  /** show sleep Z's */
  showZ?: boolean;
  /** render tombstone instead of body */
  tombstone?: boolean;
}

export function statFromValues(hunger: number, mood: number, energy: number): PetState {
  const min = Math.min(hunger, mood, energy);
  if (min <= 0) return "dead";
  if (min < 25) return "critical";
  if (min < 50) return "sad";
  if (min < 75) return "content";
  return "happy";
}

export function stateModForFrame(state: PetState, frame: 0 | 1): StateMod {
  switch (state) {
    case "happy":
      return { yOffset: frame === 0 ? 0 : -1 };
    case "content":
      return { yOffset: frame === 0 ? 0 : -1 };
    case "sad":
      return { yOffset: 1, eyeOverride: "closed" };
    case "critical":
      return { yOffset: frame === 0 ? 1 : 2, eyeOverride: "closed", showZ: true };
    case "dead":
      return { yOffset: 0, tombstone: true, eyeOverride: "x" };
  }
}
