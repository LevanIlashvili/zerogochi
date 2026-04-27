import styles from "./Device.module.css";

interface Props {
  children: React.ReactNode;
  /** rendered below the LCD (e.g. buttons) — outside the green panel */
  controls?: React.ReactNode;
  /** rendered at the very bottom (e.g. address line) */
  footer?: React.ReactNode;
}

export function Device({ children, controls, footer }: Props) {
  return (
    <div className={styles.bezel}>
      <div className={styles.topRow}>
        <span className={styles.led} aria-hidden />
        <span className={styles.brand}>0G</span>
      </div>
      <div className={styles.lcd}>
        <div className={styles.lcdInner}>{children}</div>
      </div>
      {controls}
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
