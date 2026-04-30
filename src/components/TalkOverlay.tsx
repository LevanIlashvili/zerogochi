"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./TalkOverlay.module.css";
import { BEEPS } from "@/lib/beep";

interface Props {
  /** Awaits the typewriter completion before resolving */
  reply: string;
  verified: boolean;
  onClose: () => void;
}

export function TalkOverlay({ reply, verified, onClose }: Props) {
  const [shown, setShown] = useState("");
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let i = 0;
    intervalRef.current = window.setInterval(() => {
      i += 1;
      setShown(reply.slice(0, i));
      // beep on every other character to avoid auditory overload
      if (i % 2 === 0) BEEPS.talk();
      if (i >= reply.length && intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
      }
    }, 35);
    return () => {
      if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    };
  }, [reply]);

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={`${styles.text} prose`}>
          {shown}
          <span className={styles.cursor}>_</span>
        </div>
        <div className={styles.foot}>
          <span>{verified ? "tee verified" : "tee unverified"}</span>
          <button className={styles.close} onClick={onClose}>X</button>
        </div>
      </div>
    </div>
  );
}
