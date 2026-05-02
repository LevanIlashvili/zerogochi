/// Pet life stage by age. Each stage gets a slightly different sprite
/// scale + a label.

export type PetStage = "child" | "adult" | "elder";

export interface StageInfo {
  stage: PetStage;
  label: string;
  /** scale multiplier applied on top of the base sprite scale */
  scaleMul: number;
  /** age in human-readable form */
  ageStr: string;
}

const HOUR = 3600;
const DAY = 86_400;

export function stageFor(bornAtUnix: number | null | undefined): StageInfo {
  if (!bornAtUnix) {
    return { stage: "child", label: "newborn", scaleMul: 0.85, ageStr: "0d" };
  }
  const ageSec = Math.max(0, Math.floor(Date.now() / 1000) - bornAtUnix);
  const ageDays = Math.floor(ageSec / DAY);
  const ageHours = Math.floor(ageSec / HOUR);

  let stage: PetStage;
  let scaleMul: number;
  let label: string;
  if (ageSec < DAY) {
    stage = "child";
    scaleMul = 0.85;
    label = "child";
  } else if (ageSec < 7 * DAY) {
    stage = "adult";
    scaleMul = 1.0;
    label = "adult";
  } else {
    stage = "elder";
    scaleMul = 1.05;
    label = "elder";
  }

  const ageStr = ageDays > 0 ? `${ageDays}d` : `${ageHours}h`;
  return { stage, label, scaleMul, ageStr };
}
