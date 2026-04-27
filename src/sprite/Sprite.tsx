import {
  BODY_ROUND,
  BODY_TALL,
  BODY_BLOB,
  EYES_DOT,
  EYES_LINE,
  EYES_CROSS,
  EYES_SPIRAL,
  EARS_NONE,
  EARS_ANTENNA,
  EARS_PAIR,
  patternPixels,
  type PixelGrid,
} from "./pixels";
import type { SpriteLook, PetState } from "./types";
import { stateModForFrame } from "./states";

const SIZE = 16;

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
  "                ",
  "                ",
  "                ",
  "    ######      ",
  "   ########     ",
  "   ########     ",
  "   ########     ",
  "   ########     ",
  "   ########     ",
  "   ########     ",
  "   ########     ",
  "   ########     ",
  "   ########     ",
  "  ##########    ",
  " ############   ",
  "                ",
];

const EYES_X = [
  { x: 5, y: 7, w: 1, h: 1 },
  { x: 6, y: 8, w: 1, h: 1 },
  { x: 7, y: 7, w: 1, h: 1 },
  { x: 9, y: 7, w: 1, h: 1 },
  { x: 10, y: 8, w: 1, h: 1 },
  { x: 11, y: 7, w: 1, h: 1 },
];

const EYES_CLOSED = [
  { x: 5, y: 8, w: 2, h: 1 },
  { x: 9, y: 8, w: 2, h: 1 },
];

interface Props {
  look: SpriteLook;
  state?: PetState;
  frame?: 0 | 1;
  scale?: number;
  fill?: string;
  shadow?: string;
}

export function Sprite({ look, state = "content", frame = 0, scale = 6, fill, shadow }: Props) {
  const safeScale = Math.max(1, Math.floor(scale));
  const mod = stateModForFrame(state, frame);
  const body = mod.tombstone ? TOMBSTONE : BODY_BY[look.body];
  const baseEyes = EYES_BY[look.eyes];
  const eyes =
    mod.eyeOverride === "x"
      ? EYES_X
      : mod.eyeOverride === "closed"
        ? EYES_CLOSED
        : baseEyes;
  const ears = mod.tombstone ? [] : EARS_BY[look.ears];
  const pattern = mod.tombstone ? [] : patternPixels(body, look.pattern);

  const fillColor = fill ?? "var(--gb-darkest)";
  const shadowColor = shadow ?? "var(--gb-dark)";

  const offsetY = mod.yOffset;

  const bodyRects: React.ReactElement[] = [];
  for (let y = 0; y < body.length; y++) {
    for (let x = 0; x < body[y].length; x++) {
      if (body[y][x] === "#") {
        bodyRects.push(
          <rect
            key={`b${x}-${y}`}
            x={x}
            y={y + offsetY}
            width={1}
            height={1}
            fill={fillColor}
          />,
        );
      }
    }
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
      {ears.map((r, i) => (
        <rect
          key={`e${i}`}
          x={r.x}
          y={r.y + offsetY}
          width={r.w}
          height={r.h}
          fill={fillColor}
        />
      ))}
      {bodyRects}
      {pattern.map((r, i) => (
        <rect
          key={`p${i}`}
          x={r.x}
          y={r.y + offsetY}
          width={r.w}
          height={r.h}
          fill={shadowColor}
        />
      ))}
      {eyes.map((r, i) => (
        <rect
          key={`y${i}`}
          x={r.x}
          y={r.y + offsetY}
          width={r.w}
          height={r.h}
          fill={shadowColor}
        />
      ))}
      {mod.showZ && (
        <>
          <rect x={12} y={2} width={1} height={1} fill={fillColor} />
          <rect x={13} y={2} width={1} height={1} fill={fillColor} />
          <rect x={13} y={3} width={1} height={1} fill={fillColor} />
          <rect x={12} y={4} width={1} height={1} fill={fillColor} />
          <rect x={13} y={4} width={1} height={1} fill={fillColor} />
        </>
      )}
    </svg>
  );
}
