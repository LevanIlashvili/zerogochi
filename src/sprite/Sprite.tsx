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

interface Props {
  look: SpriteLook;
  state?: PetState;
  frame?: 0 | 1;
  scale?: number;
}

const COLOR = {
  outline: "var(--gb-darkest)",
  fill: "var(--gb-light)",
  shadow: "var(--gb-dark)",
  highlight: "var(--gb-lightest)",
} as const;

function mouthForState(state: PetState, frame: 0 | 1): Pixel[] {
  switch (state) {
    case "happy":
      // alternates between smile and open mouth (laughing)
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

function eyesForState(state: PetState, base: Pixel[]): Pixel[] {
  if (state === "dead") return EYES_X;
  if (state === "critical" || state === "sad") return EYES_CLOSED;
  return base;
}

export function Sprite({ look, state = "content", frame = 0, scale = 6 }: Props) {
  const safeScale = Math.max(1, Math.floor(scale));
  const mod = stateModForFrame(state, frame);
  const isTomb = mod.tombstone;

  const body = isTomb ? TOMBSTONE : BODY_BY[look.body];
  const eyes = isTomb ? [] : eyesForState(state, EYES_BY[look.eyes]);
  const ears = isTomb ? [] : EARS_BY[look.ears];
  const pattern = isTomb ? [] : patternPixels(body, look.pattern);
  const mouth = isTomb ? [] : mouthForState(state, frame);
  const cheeks = !isTomb && state === "happy" ? CHEEKS : [];

  const yOff = mod.yOffset;

  // Render body grid
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
        <rect
          key={`b${x}-${y}`}
          x={x}
          y={y + yOff}
          width={1}
          height={1}
          fill={color}
        />,
      );
    }
  }

  function paintPixels(pixels: Pixel[], defaultColor: keyof typeof COLOR, prefix: string) {
    return pixels.map((p, i) => {
      const c = p.c ?? defaultColor;
      return (
        <rect
          key={`${prefix}${i}`}
          x={p.x}
          y={p.y + yOff}
          width={1}
          height={1}
          fill={COLOR[c]}
        />
      );
    });
  }

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
      {state === "happy" && frame === 1 && (
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
