import styles from "./Device.module.css";

export function Device({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.bezel}>
      <div className={styles.topRow}>
        <span className={styles.led} aria-hidden />
        <span className={styles.brand}>0G</span>
      </div>
      <div className={styles.lcd}>
        <div className={styles.lcdInner}>{children}</div>
      </div>
    </div>
  );
}
