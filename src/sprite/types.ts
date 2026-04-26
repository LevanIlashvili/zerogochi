export type Body = "round" | "tall" | "blob";
export type Eyes = "dot" | "line" | "cross" | "spiral";
export type Ears = "none" | "antenna" | "ears";
export type Pattern = "plain" | "spotted" | "striped" | "gradient";
export type PetState = "happy" | "content" | "sad" | "critical" | "dead";

export interface SpriteLook {
  body: Body;
  eyes: Eyes;
  ears: Ears;
  pattern: Pattern;
}

const BODIES: Body[] = ["round", "tall", "blob"];
const EYES: Eyes[] = ["dot", "line", "cross", "spiral"];
const EARS: Ears[] = ["none", "antenna", "ears"];
const PATTERNS: Pattern[] = ["plain", "spotted", "striped", "gradient"];

export function lookFromSeed(seed: number): SpriteLook {
  return {
    body: BODIES[seed % 3],
    eyes: EYES[(seed >> 2) & 0b11],
    ears: EARS[(seed >> 4) % 3],
    pattern: PATTERNS[(seed >> 6) & 0b11],
  };
}
