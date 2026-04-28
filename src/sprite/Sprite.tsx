import {
  BODY_ROUND,
  BODY_TALL,
  BODY_BLOB,
  EYES_DOT,
  EYES_LINE,
  EYES_CROSS,
  EYES_SPIRAL,
  EYES_CLOSED,
  EYES_X,
  EARS_NONE,
  EARS_ANTENNA,
  EARS_PAIR,
  MOUTH_SMILE,
  MOUTH_OPEN,
  MOUTH_NEUTRAL,
  MOUTH_FROWN,
  MOUTH_NONE,
  CHEEKS,
  PROP_BREAD,
  PROP_BALL,
  PROP_HEART,
  PROP_STAR,
  patternPixels,
  SIZE,
  type PixelGrid,
  type Pixel,
} from "./pixels";
import type { SpriteLook, PetState } from "./types";
import { stateModForFrame } from "./states";

const BODY_BY: Record<SpriteLook["body"], PixelGrid> = {
  round: BODY_ROUND,
  tall: BODY_TALL,
  blob: BODY_BLOB,
};

const EYES_BY = {
  dot: EYES_DOT,
  line: EYES_LINE,
  cross: EYES_CROSS,
  spiral: EYES_SPIRAL,
};

const EARS_BY = {
  none: EARS_NONE,
  antenna: EARS_ANTENNA,
  ears: EARS_PAIR,
};

const TOMBSTONE: PixelGrid = [
  "                        ",
  "                        ",
  "                        ",
  "         oooooo         ",
  "       oo######oo       ",
  "      o##########o      ",
  "     o############o     ",
  "    o##############o    ",
  "    o##############o    ",
  "    o##############o    ",
  "    o##.R.I.P..##o     ",
  "    o##############o    ",
  "    o##############o    ",
  "    o##############o    ",
  "    o##############o    ",
  "    o##############o    ",
  "    o##############o    ",
  "    o##############o    ",
  "  oo################oo  ",
  " o####################o ",
  "ooooooooooooooooooooooo ",
  "                        ",
  "                        ",
  "                        ",
];

export type Action = "idle" | "eating" | "playing" | "talking";

interface Props {
  look: SpriteLook;
  state?: PetState;
  frame?: 0 | 1;
  scale?: number;
  /** Action overlay — drives prop + mouth/expression overrides */
  action?: Action;
  /** Within an action, frame index 0..3 for sequencing */
  actionFrame?: 0 | 1 | 2 | 3;
  /** Optional floating reaction pixels (e.g. heart, star) at top-left */
  reaction?: "heart" | "star" | null;
  /** y-offset to apply to a reaction (for floating animation) */
  reactionY?: number;
  /** idle micro-expression: 0=normal, 1=blink, 2=look-left, 3=look-right */
  idleMicro?: 0 | 1 | 2 | 3;
}

const COLOR = {
  outline: "var(--gb-darkest)",
  fill: "var(--gb-light)",
  shadow: "var(--gb-dark)",
  highlight: "var(--gb-lightest)",
} as const;

function mouthForState(state: PetState, frame: 0 | 1, action: Action, actionFrame: 0 | 1 | 2 | 3): Pixel[] {
  if (action === "eating") {
    // chomp chomp chomp — alternate open/closed
    return actionFrame % 2 === 0 ? MOUTH_OPEN : MOUTH_NEUTRAL;
  }
  if (action === "playing") return MOUTH_OPEN;
  if (action === "talking") return frame === 0 ? MOUTH_OPEN : MOUTH_NEUTRAL;
  switch (state) {
    case "happy":
      return frame === 0 ? MOUTH_SMILE : MOUTH_OPEN;
    case "content":
      return MOUTH_SMILE;
    case "sad":
      return MOUTH_NEUTRAL;
    case "critical":
      return MOUTH_FROWN;
    case "dead":
      return MOUTH_NONE;
  }
}

function shiftEyes(eyes: Pixel[], dx: number): Pixel[] {
  return eyes.map((p) => ({ ...p, x: p.x + dx }));
}

function eyesForState(state: PetState, base: Pixel[], idleMicro: 0 | 1 | 2 | 3): Pixel[] {
  if (state === "dead") return EYES_X;
  if (state === "critical" || state === "sad") return EYES_CLOSED;
  if (idleMicro === 1) return EYES_CLOSED; // blink
  if (idleMicro === 2) return shiftEyes(base, -1); // look left
  if (idleMicro === 3) return shiftEyes(base, 1); // look right
  return base;
}

function propForAction(action: Action, actionFrame: 0 | 1 | 2 | 3): Pixel[] {
  if (action === "eating") {
    // bread starts visible, gets nibbled away
    if (actionFrame === 0) return PROP_BREAD;
    if (actionFrame === 1) return PROP_BREAD.slice(0, Math.floor(PROP_BREAD.length * 0.7));
    if (actionFrame === 2) return PROP_BREAD.slice(0, Math.floor(PROP_BREAD.length * 0.3));
    return [];
  }
  if (action === "playing") {
    // ball bounces - move it up/down
    const yShift = actionFrame === 0 ? 0 : actionFrame === 1 ? -3 : actionFrame === 2 ? -3 : 0;
    return PROP_BALL.map((p) => ({ ...p, y: p.y + yShift }));
  }
  return [];
}

export function Sprite({
  look,
  state = "content",
  frame = 0,
  scale = 6,
  action = "idle",
  actionFrame = 0,
  reaction = null,
  reactionY = 0,
  idleMicro = 0,
}: Props) {
  const safeScale = Math.max(1, Math.floor(scale));
  const mod = stateModForFrame(state, frame);
  const isTomb = mod.tombstone;
  const inAction = action !== "idle";

  const body = isTomb ? TOMBSTONE : BODY_BY[look.body];
  const baseEyes = isTomb ? [] : EYES_BY[look.eyes];
  const eyes = isTomb ? EYES_X : eyesForState(state, baseEyes, idleMicro);
  const ears = isTomb ? [] : EARS_BY[look.ears];
  const pattern = isTomb ? [] : patternPixels(body, look.pattern);
  const mouth = isTomb ? [] : mouthForState(state, frame, action, actionFrame);
  const cheeks = !isTomb && (state === "happy" || action === "eating") ? CHEEKS : [];
  const prop = propForAction(action, actionFrame);

  // bounce more during play action
  const yOff = inAction
    ? action === "playing"
      ? actionFrame === 1 || actionFrame === 2
        ? -2
        : 0
      : actionFrame % 2 === 0
        ? 0
        : -1
    : mod.yOffset;

  const bodyRects: React.ReactElement[] = [];
  for (let y = 0; y < body.length; y++) {
    for (let x = 0; x < body[y].length; x++) {
      const ch = body[y][x];
      if (ch === " ") continue;
      let color: string = COLOR.fill;
      if (ch === "o") color = COLOR.outline;
      else if (ch === "#") color = COLOR.fill;
      else if (ch === ".") color = COLOR.shadow;
      else if (ch === "h") color = COLOR.highlight;
      else if (ch === "R" || ch === "I" || ch === "P") color = COLOR.outline;
      bodyRects.push(
        <rect key={`b${x}-${y}`} x={x} y={y + yOff} width={1} height={1} fill={color} />,
      );
    }
  }

  function paintPixels(pixels: Pixel[], defaultColor: keyof typeof COLOR, prefix: string, extraY = 0) {
    return pixels.map((p, i) => {
      const c = p.c ?? defaultColor;
      return (
        <rect
          key={`${prefix}${i}`}
          x={p.x}
          y={p.y + yOff + extraY}
          width={1}
          height={1}
          fill={COLOR[c]}
        />
      );
    });
  }

  const reactionPixels = reaction === "heart" ? PROP_HEART : reaction === "star" ? PROP_STAR : [];

  const px = SIZE * safeScale;
  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", display: "block" }}
    >
      {paintPixels(ears, "outline", "ear")}
      {bodyRects}
      {paintPixels(pattern, "shadow", "pat")}
      {paintPixels(cheeks, "shadow", "ch")}
      {paintPixels(eyes, "outline", "ey")}
      {paintPixels(mouth, "outline", "mo")}
      {paintPixels(prop, "fill", "pr", 0)}
      {reaction && reactionPixels.map((p, i) => (
        <rect
          key={`rx${i}`}
          x={p.x}
          y={p.y + reactionY}
          width={1}
          height={1}
          fill={COLOR[p.c ?? "outline"]}
        />
      ))}
      {mod.showZ && (
        <>
          <rect x={18} y={2} width={1} height={1} fill={COLOR.outline} />
          <rect x={19} y={2} width={1} height={1} fill={COLOR.outline} />
          <rect x={20} y={2} width={1} height={1} fill={COLOR.outline} />
          <rect x={20} y={3} width={1} height={1} fill={COLOR.outline} />
          <rect x={19} y={4} width={1} height={1} fill={COLOR.outline} />
          <rect x={18} y={5} width={1} height={1} fill={COLOR.outline} />
          <rect x={19} y={5} width={1} height={1} fill={COLOR.outline} />
          <rect x={20} y={5} width={1} height={1} fill={COLOR.outline} />
        </>
      )}
      {state === "happy" && frame === 1 && action === "idle" && (
        <>
          <rect x={2} y={4} width={1} height={1} fill={COLOR.outline} />
          <rect x={3} y={3} width={1} height={1} fill={COLOR.outline} />
          <rect x={3} y={5} width={1} height={1} fill={COLOR.outline} />
          <rect x={4} y={4} width={1} height={1} fill={COLOR.outline} />
        </>
      )}
    </svg>
  );
}
