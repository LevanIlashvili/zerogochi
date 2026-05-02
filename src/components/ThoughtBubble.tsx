"use client";

import { useEffect, useState } from "react";

interface Props {
  text: string;
  onDone: () => void;
  /** ms before bubble fades out */
  ttl?: number;
}

/**
 * Small pixel speech bubble that floats above the pet, types out a thought
 * char-by-char, lingers, then dismisses itself.
 */
export function ThoughtBubble({ text, onDone, ttl = 5000 }: Props) {
  const [shown, setShown] = useState("");
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 28);
    return () => window.clearInterval(id);
  }, [text]);

  useEffect(() => {
    const fade = window.setTimeout(() => setFading(true), ttl - 400);
    const dismiss = window.setTimeout(() => onDone(), ttl);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(dismiss);
    };
  }, [ttl, onDone]);

  return (
    <div
      className="prose"
      style={{
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        top: 4,
        background: "var(--gb-darkest)",
        color: "var(--gb-lightest)",
        border: "2px solid var(--gb-light)",
        padding: "6px 10px",
        maxWidth: 220,
        fontSize: 12,
        lineHeight: 1.3,
        opacity: fading ? 0 : 1,
        transition: "opacity 380ms ease-out",
        pointerEvents: "none",
        textAlign: "center",
        zIndex: 5,
      }}
    >
      {shown}
    </div>
  );
}
