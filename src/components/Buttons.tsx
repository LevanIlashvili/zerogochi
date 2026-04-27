"use client";

import { useState } from "react";
import styles from "./Buttons.module.css";

export type ButtonKind = "A" | "B" | "C";

export interface ButtonsProps {
  onPress: (kind: ButtonKind) => void;
  disabled?: boolean;
}

const LABELS: Record<ButtonKind, string> = {
  A: "FEED",
  B: "PLAY",
  C: "TALK",
};

export function Buttons({ onPress, disabled }: ButtonsProps) {
  const [pressed, setPressed] = useState<ButtonKind | null>(null);

  function handle(kind: ButtonKind) {
    if (disabled) return;
    setPressed(kind);
    onPress(kind);
    window.setTimeout(() => setPressed((p) => (p === kind ? null : p)), 120);
  }

  return (
    <div className={styles.row}>
      {(["A", "B", "C"] as ButtonKind[]).map((k) => (
        <button
          key={k}
          type="button"
          className={`${styles.btn} ${pressed === k ? styles.btnDown : ""}`}
          onPointerDown={() => handle(k)}
          aria-label={`${k} ${LABELS[k]}`}
          disabled={disabled}
        >
          <span className={styles.letter}>{k}</span>
          <span className={styles.label}>{LABELS[k]}</span>
        </button>
      ))}
    </div>
  );
}
