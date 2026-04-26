// All sprites are 16x16 pixel grids. Each row is a string of 16 chars.
// Legend: " " = transparent, "#" = body fill, "." = body shadow / pattern slot

export type PixelGrid = string[];

export const BODY_ROUND: PixelGrid = [
  "                ",
  "                ",
  "                ",
  "     ######     ",
  "    ########    ",
  "   ##########   ",
  "  ############  ",
  "  ############  ",
  "  ############  ",
  "  ############  ",
  "  ############  ",
  "   ##########   ",
  "    ########    ",
  "     ######     ",
  "                ",
  "                ",
];

export const BODY_TALL: PixelGrid = [
  "                ",
  "      ####      ",
  "     ######     ",
  "    ########    ",
  "    ########    ",
  "    ########    ",
  "    ########    ",
  "    ########    ",
  "    ########    ",
  "    ########    ",
  "    ########    ",
  "    ########    ",
  "    ########    ",
  "     ######     ",
  "                ",
  "                ",
];

export const BODY_BLOB: PixelGrid = [
  "                ",
  "                ",
  "                ",
  "    ##    ##    ",
  "   ####  ####   ",
  "  ############  ",
  " ############## ",
  " ############## ",
  " ############## ",
  " ############## ",
  "  ############  ",
  "   ##########   ",
  "    ########    ",
  "     ######     ",
  "      ####      ",
  "                ",
];

// Eyes overlay — drawn relative to top-left of body bbox
// Each eye is 2x2 or 1x2 pixels. Two eyes side by side.
export const EYES_DOT = [
  { x: 5, y: 7, w: 1, h: 1 },
  { x: 9, y: 7, w: 1, h: 1 },
];
export const EYES_LINE = [
  { x: 5, y: 7, w: 2, h: 1 },
  { x: 9, y: 7, w: 2, h: 1 },
];
export const EYES_CROSS = [
  { x: 5, y: 7, w: 1, h: 1 },
  { x: 6, y: 8, w: 1, h: 1 },
  { x: 5, y: 8, w: 1, h: 1 },
  { x: 9, y: 7, w: 1, h: 1 },
  { x: 10, y: 8, w: 1, h: 1 },
  { x: 9, y: 8, w: 1, h: 1 },
];
export const EYES_SPIRAL = [
  { x: 5, y: 7, w: 2, h: 2 },
  { x: 9, y: 7, w: 2, h: 2 },
  { x: 5, y: 7, w: 1, h: 1 },
  { x: 10, y: 8, w: 1, h: 1 },
];

// Ears overlay — drawn above body
export const EARS_NONE: { x: number; y: number; w: number; h: number }[] = [];
export const EARS_ANTENNA = [
  { x: 7, y: 0, w: 2, h: 1 },
  { x: 7, y: 1, w: 1, h: 1 },
  { x: 8, y: 1, w: 1, h: 1 },
  { x: 7, y: 2, w: 2, h: 1 },
];
export const EARS_PAIR = [
  { x: 3, y: 1, w: 2, h: 2 },
  { x: 11, y: 1, w: 2, h: 2 },
  { x: 4, y: 3, w: 1, h: 1 },
  { x: 11, y: 3, w: 1, h: 1 },
];

// Pattern application — given a body mask, return positions to overlay with shadow color
// Patterns are deterministic per body mask
export function patternPixels(
  body: PixelGrid,
  pattern: "plain" | "spotted" | "striped" | "gradient",
): { x: number; y: number; w: number; h: number }[] {
  if (pattern === "plain") return [];
  const out: { x: number; y: number; w: number; h: number }[] = [];
  for (let y = 0; y < body.length; y++) {
    for (let x = 0; x < body[y].length; x++) {
      if (body[y][x] !== "#") continue;
      if (pattern === "spotted" && (x + y) % 4 === 0) {
        out.push({ x, y, w: 1, h: 1 });
      } else if (pattern === "striped" && y % 3 === 0) {
        out.push({ x, y, w: 1, h: 1 });
      } else if (pattern === "gradient" && y >= body.length - 4) {
        out.push({ x, y, w: 1, h: 1 });
      }
    }
  }
  return out;
}
