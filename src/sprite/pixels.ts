// All sprites are 24x24 pixel grids. Each row is a string of 24 chars.
// Legend:
//   " " = transparent
//   "#" = body fill (gb-light)
//   "." = body shadow (gb-dark)
//   "o" = outline (gb-darkest)
//   "h" = highlight (gb-lightest, used for shine spots)

export type PixelGrid = string[];

export const SIZE = 24;

// ROUND BODY — chubby sphere, has feet
export const BODY_ROUND: PixelGrid = [
  "                        ",
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
  "    o##############o    ",
  "    o##############o    ",
  "    o##############o    ",
  "    o##############o    ",
  "    o##############o    ",
  "     o############o     ",
  "      o##########o      ",
  "       o########o       ",
  "        oo####oo        ",
  "        o#oo#o          ",
  "        oo  oo          ",
  "                        ",
  "                        ",
];

// TALL BODY — bowling-pin shape, narrower top, wider bottom
export const BODY_TALL: PixelGrid = [
  "                        ",
  "                        ",
  "          oooo          ",
  "         o####o         ",
  "        o######o        ",
  "        o######o        ",
  "       o########o       ",
  "       o########o       ",
  "       o########o       ",
  "      o##########o      ",
  "      o##########o      ",
  "     o############o     ",
  "     o############o     ",
  "    o##############o    ",
  "    o##############o    ",
  "    o##############o    ",
  "    o##############o    ",
  "     o############o     ",
  "      o##########o      ",
  "       oo######oo       ",
  "         o####o         ",
  "        oo    oo        ",
  "                        ",
  "                        ",
];

// BLOB BODY — amorphous, asymmetric drips, has 2 little feet
export const BODY_BLOB: PixelGrid = [
  "                        ",
  "                        ",
  "                        ",
  "         oooooo         ",
  "       oo######oo       ",
  "      o##########o      ",
  "     o############o     ",
  "    o##############o    ",
  "    o##############o    ",
  "   o################o   ",
  "   o################o   ",
  "   o################o   ",
  "  o##################o  ",
  "  o##################o  ",
  "  o##################o  ",
  "   o################o   ",
  "    o##############o    ",
  "     o############o     ",
  "      o##########o      ",
  "       o########o       ",
  "        oo####oo        ",
  "        o#oo#o          ",
  "        oo  oo          ",
  "                        ",
];

// =====================================================================
// EYES — drawn at face level (around y=10..13). Each eye is a feature box.
// =====================================================================

export interface Pixel {
  x: number;
  y: number;
  c?: "outline" | "shadow" | "highlight";
}

// Standard dot eyes — 2x2 dark squares
export const EYES_DOT: Pixel[] = [
  { x: 8, y: 11 }, { x: 9, y: 11 },
  { x: 8, y: 12 }, { x: 9, y: 12 },
  { x: 14, y: 11 }, { x: 15, y: 11 },
  { x: 14, y: 12 }, { x: 15, y: 12 },
  // tiny highlight in each
  { x: 9, y: 11, c: "highlight" },
  { x: 15, y: 11, c: "highlight" },
];

// Line eyes — horizontal lines, sleepy/cool look
export const EYES_LINE: Pixel[] = [
  { x: 7, y: 12 }, { x: 8, y: 12 }, { x: 9, y: 12 }, { x: 10, y: 12 },
  { x: 13, y: 12 }, { x: 14, y: 12 }, { x: 15, y: 12 }, { x: 16, y: 12 },
];

// Cross eyes — small + symbols
export const EYES_CROSS: Pixel[] = [
  { x: 9, y: 11 },
  { x: 8, y: 12 }, { x: 9, y: 12 }, { x: 10, y: 12 },
  { x: 9, y: 13 },
  { x: 15, y: 11 },
  { x: 14, y: 12 }, { x: 15, y: 12 }, { x: 16, y: 12 },
  { x: 15, y: 13 },
];

// Spiral eyes — bigger, with a swirl detail
export const EYES_SPIRAL: Pixel[] = [
  { x: 7, y: 10 }, { x: 8, y: 10 }, { x: 9, y: 10 }, { x: 10, y: 10 },
  { x: 7, y: 11 },                                   { x: 10, y: 11 },
  { x: 7, y: 12 },                                   { x: 10, y: 12 },
  { x: 7, y: 13 }, { x: 8, y: 13 }, { x: 9, y: 13 }, { x: 10, y: 13 },
  { x: 8, y: 11, c: "shadow" }, { x: 9, y: 11, c: "shadow" },
  { x: 13, y: 10 }, { x: 14, y: 10 }, { x: 15, y: 10 }, { x: 16, y: 10 },
  { x: 13, y: 11 },                                       { x: 16, y: 11 },
  { x: 13, y: 12 },                                       { x: 16, y: 12 },
  { x: 13, y: 13 }, { x: 14, y: 13 }, { x: 15, y: 13 }, { x: 16, y: 13 },
  { x: 14, y: 11, c: "shadow" }, { x: 15, y: 11, c: "shadow" },
];

// Closed eyes (sleeping/sad) — soft curves
export const EYES_CLOSED: Pixel[] = [
  { x: 7, y: 12 }, { x: 8, y: 13 }, { x: 9, y: 13 }, { x: 10, y: 12 },
  { x: 13, y: 12 }, { x: 14, y: 13 }, { x: 15, y: 13 }, { x: 16, y: 12 },
];

// X eyes (dead)
export const EYES_X: Pixel[] = [
  { x: 7, y: 11 }, { x: 10, y: 11 },
  { x: 8, y: 12 }, { x: 9, y: 12 },
  { x: 7, y: 13 }, { x: 10, y: 13 },
  { x: 13, y: 11 }, { x: 16, y: 11 },
  { x: 14, y: 12 }, { x: 15, y: 12 },
  { x: 13, y: 13 }, { x: 16, y: 13 },
];

// =====================================================================
// MOUTHS — face anchor. Read at y=15..17.
// =====================================================================
export const MOUTH_SMILE: Pixel[] = [
  { x: 9, y: 16 }, { x: 14, y: 16 },
  { x: 10, y: 17 }, { x: 11, y: 17 }, { x: 12, y: 17 }, { x: 13, y: 17 },
];

export const MOUTH_OPEN: Pixel[] = [
  { x: 10, y: 16 }, { x: 11, y: 16 }, { x: 12, y: 16 }, { x: 13, y: 16 },
  { x: 9, y: 17 }, { x: 14, y: 17 },
  { x: 10, y: 18 }, { x: 11, y: 18 }, { x: 12, y: 18 }, { x: 13, y: 18 },
];

export const MOUTH_NEUTRAL: Pixel[] = [
  { x: 10, y: 17 }, { x: 11, y: 17 }, { x: 12, y: 17 }, { x: 13, y: 17 },
];

export const MOUTH_FROWN: Pixel[] = [
  { x: 10, y: 18 }, { x: 11, y: 18 }, { x: 12, y: 18 }, { x: 13, y: 18 },
  { x: 9, y: 17 }, { x: 14, y: 17 },
];

export const MOUTH_NONE: Pixel[] = [];

// =====================================================================
// EARS / TOP — drawn above the body
// =====================================================================
export const EARS_NONE: Pixel[] = [];

export const EARS_ANTENNA: Pixel[] = [
  { x: 11, y: 0, c: "outline" }, { x: 12, y: 0, c: "outline" },
  { x: 11, y: 1, c: "outline" }, { x: 12, y: 1, c: "outline" },
  { x: 11, y: 2, c: "outline" }, { x: 12, y: 2, c: "outline" },
  { x: 11, y: 3, c: "outline" }, { x: 12, y: 3, c: "outline" },
];

export const EARS_PAIR: Pixel[] = [
  // left ear
  { x: 5, y: 3, c: "outline" }, { x: 6, y: 3, c: "outline" },
  { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4, c: "outline" },
  { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 },
  { x: 6, y: 6, c: "outline" }, { x: 7, y: 6 },
  // right ear (mirror)
  { x: 17, y: 3, c: "outline" }, { x: 18, y: 3, c: "outline" },
  { x: 16, y: 4, c: "outline" }, { x: 17, y: 4 }, { x: 18, y: 4 },
  { x: 16, y: 5 }, { x: 17, y: 5 }, { x: 18, y: 5 },
  { x: 16, y: 6 }, { x: 17, y: 6, c: "outline" },
];

// =====================================================================
// CHEEK DOTS — happy state only
// =====================================================================
export const CHEEKS: Pixel[] = [
  { x: 6, y: 14, c: "shadow" }, { x: 7, y: 14, c: "shadow" },
  { x: 16, y: 14, c: "shadow" }, { x: 17, y: 14, c: "shadow" },
];

// =====================================================================
// PATTERNS — applied as shadow color over body fill
// =====================================================================
export function patternPixels(
  body: PixelGrid,
  pattern: "plain" | "spotted" | "striped" | "gradient",
): Pixel[] {
  if (pattern === "plain") return [];
  const out: Pixel[] = [];
  for (let y = 0; y < body.length; y++) {
    for (let x = 0; x < body[y].length; x++) {
      if (body[y][x] !== "#") continue;
      // skip face area so pattern doesn't fight features
      if (y >= 9 && y <= 18) continue;
      if (pattern === "spotted") {
        // 3x2 spaced dots at x%5==1 && y%4==0
        if (x % 5 === 1 && y % 4 === 0) {
          out.push({ x, y, c: "shadow" });
          if (body[y][x + 1] === "#") out.push({ x: x + 1, y, c: "shadow" });
        }
      } else if (pattern === "striped") {
        if (y % 4 === 0) out.push({ x, y, c: "shadow" });
      } else if (pattern === "gradient") {
        // bottom half darker
        if (y >= body.length / 2 + 2) out.push({ x, y, c: "shadow" });
      }
    }
  }
  return out;
}
