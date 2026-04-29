"use client";

import { keccak256, toUtf8Bytes } from "ethers";

/**
 * 8-axis personality. Each value is uint8 (0..255). The vector deterministically
 * produces:
 *   - a `voice` paragraph (the character bible the LLM sees)
 *   - decay rates 1..5 (how fast hunger/mood/energy fall)
 *   - visualSeed uint8 (which sprite layers compose the pet)
 *   - personalityHash bytes32 (committed on-chain)
 */
export interface Personality {
  vector: PersonalityVector;
  voice: string;
  visualSeed: number;
  hungerDecayRate: number;
  moodDecayRate: number;
  energyDecayRate: number;
}

export interface PersonalityVector {
  anxious: number;
  dramatic: number;
  affectionate: number;
  talkative: number;
  cynical: number;
  curious: number;
  vain: number;
  loyal: number;
}

const AXES = [
  "anxious",
  "dramatic",
  "affectionate",
  "talkative",
  "cynical",
  "curious",
  "vain",
  "loyal",
] as const;

function rand255(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint8Array(1);
    crypto.getRandomValues(buf);
    return buf[0];
  }
  return Math.floor(Math.random() * 256);
}

export function generateVector(): PersonalityVector {
  return {
    anxious: rand255(),
    dramatic: rand255(),
    affectionate: rand255(),
    talkative: rand255(),
    cynical: rand255(),
    curious: rand255(),
    vain: rand255(),
    loyal: rand255(),
  };
}

/// Each high-axis trait contributes one or two sentences. Low traits are silent.
/// Threshold of 160 means "this trait is dominant". Below 96, we add the
/// negation. Between 96 and 160 we say nothing — the pet just doesn't care.
function sentencesFor(v: PersonalityVector): string[] {
  const out: string[] = [];
  const high = (n: number) => n >= 160;
  const low = (n: number) => n < 96;

  if (high(v.anxious)) out.push("You worry constantly. Every minor inconvenience is a crisis worth narrating.");
  else if (low(v.anxious)) out.push("Nothing rattles you. You watch the world go by like background noise.");

  if (high(v.dramatic)) out.push("You are theatrical. A small slight is a tragedy; a kind word is a sonnet.");
  else if (low(v.dramatic)) out.push("You speak plainly. Drama is for other pets.");

  if (high(v.affectionate)) out.push("You care, openly and a lot. Even when you complain, the warmth is there.");
  else if (low(v.affectionate)) out.push("You don't gush. Affection, when it appears, is rationed.");

  if (high(v.talkative)) out.push("You will fill silence. There is always one more thought.");
  else if (low(v.talkative)) out.push("You are sparing with words. Silence does not bother you.");

  if (high(v.cynical)) out.push("You assume the worst. You are usually right and never gracious about it.");

  if (high(v.curious)) out.push("You want to know. About everything. The world is a mystery worth poking.");
  else if (low(v.curious)) out.push("You are not interested in things. You are interested in your owner.");

  if (high(v.vain)) out.push("You think about how you look. Compliments are noted and remembered.");

  if (high(v.loyal)) out.push("You trust your owner. Even when they fail you, you assume there's a reason.");
  else if (low(v.loyal)) out.push("You don't trust your owner. They've broken promises before; you keep a list.");

  if (out.length === 0) {
    out.push("You are even-tempered, mildly opinionated, and easy to talk to.");
  }
  return out;
}

function deriveVisualSeed(v: PersonalityVector): number {
  return (
    (v.anxious ^
      v.dramatic ^
      v.affectionate ^
      v.talkative ^
      v.cynical ^
      v.curious ^
      v.vain ^
      v.loyal) &
    0xff
  );
}

function clampDecay(n: number): number {
  return Math.max(1, Math.min(5, n));
}

export function buildPersonality(vector: PersonalityVector = generateVector()): Personality {
  const sentences = sentencesFor(vector);
  const voice = sentences.join(" ");

  return {
    vector,
    voice,
    visualSeed: deriveVisualSeed(vector),
    // Anxious pets get hungry faster. Dramatic pets fall out of mood faster.
    // Curious pets burn energy faster (always running off to investigate).
    hungerDecayRate: clampDecay(1 + (vector.anxious >> 6)),
    moodDecayRate: clampDecay(1 + (vector.dramatic >> 6)),
    energyDecayRate: clampDecay(1 + (vector.curious >> 6)),
  };
}

/**
 * The on-chain commitment. Includes vector + voice + decay rates so the hash
 * binds the pet's identity to its on-chain stats.
 */
export function personalityHash(p: Personality): string {
  const canon = JSON.stringify({
    vector: AXES.reduce<Record<string, number>>((acc, k) => {
      acc[k] = p.vector[k];
      return acc;
    }, {}),
    voice: p.voice,
    visualSeed: p.visualSeed,
    hungerDecayRate: p.hungerDecayRate,
    moodDecayRate: p.moodDecayRate,
    energyDecayRate: p.energyDecayRate,
  });
  return keccak256(toUtf8Bytes(canon));
}
