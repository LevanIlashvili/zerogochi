import styles from "./StatBars.module.css";

interface Stat {
  label: string;
  value: number; // 0..100
}

function Bar({ label, value }: Stat) {
  const cells = 6;
  const filled = Math.round((value / 100) * cells);
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
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
      <Bar label="HP" value={hunger} />
      <Bar label="MO" value={mood} />
      <Bar label="EN" value={energy} />
    </div>
  );
}
