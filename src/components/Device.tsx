"use client";

import { useEffect, useState } from "react";
import styles from "./Device.module.css";

interface Props {
  children: React.ReactNode;
  controls?: React.ReactNode;
  footer?: React.ReactNode;
}

function Battery() {
  return (
    <span className={styles.battery} aria-hidden>
      <span className={styles.batteryFill} />
      <span className={styles.batteryFill} />
      <span className={styles.batteryFill} />
      <span className={styles.batteryFill} />
    </span>
  );
}

function Clock() {
  const [time, setTime] = useState<string>("--:--");
  useEffect(() => {
    function update() {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      setTime(`${hh}:${mm}`);
    }
    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return <span className={styles.clock}>{time}</span>;
}

export function Device({ children, controls, footer }: Props) {
  return (
    <div className={styles.bezel}>
      <div className={styles.topRow}>
        <span className={styles.led} aria-hidden />
        <Clock />
        <span className={styles.brand}>0G</span>
        <Battery />
      </div>
      <div className={styles.lcd}>
        <div className={styles.lcdInner}>
          {children}
          <span className={styles.gloss} aria-hidden />
        </div>
      </div>
      {controls}
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
