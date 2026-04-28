import styles from "./StatBars.module.css";

type IconKind = "heart" | "sun" | "bolt";

function Icon({ kind }: { kind: IconKind }) {
  // 7x7 icons, drawn as a grid of pixel divs
  const grids: Record<IconKind, string[]> = {
    heart: [
      " ## ## ",
      "#######",
      "#######",
      "#######",
      " ##### ",
      "  ###  ",
      "   #   ",
    ],
    sun: [
      "   #   ",
      "# # # #",
      " ##### ",
      "## # ##",
      " ##### ",
      "# # # #",
      "   #   ",
    ],
    bolt: [
      "    ## ",
      "   ##  ",
      "  ##   ",
      " ####  ",
      "  ##   ",
      " ##    ",
      "##     ",
    ],
  };
  const g = grids[kind];
  return (
    <span className={styles.icon} aria-hidden>
      {g.map((row, y) => (
        <span key={y} className={styles.iconRow}>
          {row.split("").map((c, x) => (
            <span
              key={x}
              className={c === "#" ? styles.iconPixel : styles.iconBlank}
            />
          ))}
        </span>
      ))}
    </span>
  );
}

interface Stat {
  icon: IconKind;
  value: number;
}

function Bar({ icon, value }: Stat) {
  const cells = 10;
  const filled = Math.round((value / 100) * cells);
  return (
    <div className={styles.row}>
      <Icon kind={icon} />
      <span className={styles.track}>
        {Array.from({ length: cells }).map((_, i) => (
          <span key={i} className={i < filled ? styles.cellOn : styles.cellOff} />
        ))}
      </span>
    </div>
  );
}

export function StatBars({ hunger, mood, energy }: { hunger: number; mood: number; energy: number }) {
  return (
    <div className={styles.bars}>
      <Bar icon="heart" value={hunger} />
      <Bar icon="sun" value={mood} />
      <Bar icon="bolt" value={energy} />
    </div>
  );
}
