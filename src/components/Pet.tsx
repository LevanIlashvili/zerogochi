"use client";

import { useEffect, useRef, useState } from "react";
import { Device } from "./Device";
import { StatBars } from "./StatBars";
import { Buttons, type ButtonKind } from "./Buttons";
import { AnimatedSprite, type AnimatedSpriteHandle } from "@/sprite/AnimatedSprite";
import { lookFromSeed } from "@/sprite/types";
import { statFromValues } from "@/sprite/states";
import { BEEPS } from "@/lib/beep";
import { loadOrCreateWallet, type ZgWallet } from "@/lib/wallet";
import { isOnchainConfigured, onchain } from "@/lib/actions";
import { api, BackendError } from "@/lib/api";

interface Stats {
  hunger: number;
  mood: number;
  energy: number;
}

const INITIAL: Stats = { hunger: 80, mood: 65, energy: 90 };

export function Pet() {
  const [seed, setSeed] = useState(142);
  const look = lookFromSeed(seed);
  const [stats, setStats] = useState<Stats>(INITIAL);
  const [bornAt, setBornAt] = useState<number>(() => Date.now() - 1000 * 60 * 60 * 24 * 3);
  const [booting, setBooting] = useState(true);
  const [bootStep, setBootStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [wallet, setWallet] = useState<ZgWallet | null>(null);
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [chainMode, setChainMode] = useState(false);
  const spriteRef = useRef<AnimatedSpriteHandle | null>(null);
  const state = statFromValues(stats.hunger, stats.mood, stats.energy);
  const ageDays = Math.floor((Date.now() - bornAt) / (1000 * 60 * 60 * 24));

  // Boot sequence
  useEffect(() => {
    const t1 = window.setTimeout(() => setBootStep(1), 280);
    const t2 = window.setTimeout(() => setBootStep(2), 700);
    const t3 = window.setTimeout(() => setBooting(false), 1300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  // Hydrate wallet + fetch pet on first mount when on-chain is configured
  useEffect(() => {
    if (!isOnchainConfigured()) return;
    let cancel = false;
    (async () => {
      try {
        const w = await loadOrCreateWallet();
        if (cancel) return;
        setWallet(w);
        const pet = await api.myPet(w.address);
        if (cancel) return;
        if (pet.exists) {
          setTokenId(pet.tokenId);
          setSeed(pet.tokenId & 0xff);
          setStats({
            hunger: pet.hunger ?? 100,
            mood: pet.mood ?? 100,
            energy: pet.energy ?? 100,
          });
          setBornAt(Date.now()); // unknown until we fetch born event
          setChainMode(true);
        }
      } catch (err) {
        if (err instanceof BackendError && err.status === 401) {
          // Not in Telegram — stay in mock mode silently
          return;
        }
        // Any other failure — log and keep mock mode
        // eslint-disable-next-line no-console
        console.warn("on-chain hydrate failed, staying in mock mode:", err);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Gentle decay (mock only — on-chain stats refresh via polling)
  useEffect(() => {
    if (chainMode) return;
    const id = window.setInterval(() => {
      setStats((s) => ({
        hunger: Math.max(0, s.hunger - 1),
        mood: Math.max(0, s.mood - 1),
        energy: Math.max(0, s.energy - 1),
      }));
    }, 8000);
    return () => window.clearInterval(id);
  }, [chainMode]);

  // On-chain stat refresh every 12s
  useEffect(() => {
    if (!chainMode || !wallet || tokenId == null) return;
    const id = window.setInterval(async () => {
      try {
        const pet = await api.myPet(wallet.address);
        if (pet.exists) {
          setStats({
            hunger: pet.hunger ?? 0,
            mood: pet.mood ?? 0,
            energy: pet.energy ?? 0,
          });
        }
      } catch {
        // tolerate transient RPC errors
      }
    }, 12_000);
    return () => window.clearInterval(id);
  }, [chainMode, wallet, tokenId]);

  async function handle(kind: ButtonKind) {
    if (busy || booting) return;
    setBusy(true);
    try {
      if (kind === "A") {
        BEEPS.btnA();
        window.setTimeout(BEEPS.eat, 100);
        await spriteRef.current?.triggerAction("eating");
        spriteRef.current?.triggerReaction("heart");
        if (chainMode && wallet && tokenId != null) {
          await onchain.feed(wallet, tokenId);
          const pet = await api.myPet(wallet.address);
          if (pet.exists)
            setStats({ hunger: pet.hunger ?? 0, mood: pet.mood ?? 0, energy: pet.energy ?? 0 });
        } else {
          setStats((s) => ({ ...s, hunger: Math.min(100, s.hunger + 25) }));
        }
      } else if (kind === "B") {
        BEEPS.btnB();
        window.setTimeout(BEEPS.play, 100);
        await spriteRef.current?.triggerAction("playing");
        spriteRef.current?.triggerReaction("star");
        if (chainMode && wallet && tokenId != null) {
          await onchain.play(wallet, tokenId);
          const pet = await api.myPet(wallet.address);
          if (pet.exists)
            setStats({ hunger: pet.hunger ?? 0, mood: pet.mood ?? 0, energy: pet.energy ?? 0 });
        } else {
          setStats((s) => ({
            ...s,
            mood: Math.min(100, s.mood + 25),
            energy: Math.max(0, s.energy - 5),
          }));
        }
      } else {
        BEEPS.btnC();
        await spriteRef.current?.triggerAction("talking");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("action failed:", err);
    } finally {
      setBusy(false);
    }
  }

  const displayId = tokenId ?? seed;
  const addrShort = wallet
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : "0x4f3...a82b";

  return (
    <>
      <Device
        controls={<Buttons onPress={handle} disabled={busy || booting} />}
        footer={
          <>
            <div>{chainMode ? "live" : "@username"}</div>
            <div>{addrShort}</div>
          </>
        }
      >
        {booting ? (
          <BootScreen step={bootStep} />
        ) : (
          <>
            <StatBars {...stats} />
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
              <AnimatedSprite ref={spriteRef} look={look} state={state} scale={8} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 6,
                color: "var(--gb-darkest)",
                marginTop: 8,
              }}
            >
              <span>#{String(displayId).padStart(4, "0")}</span>
              <span>{ageDays}d</span>
            </div>
          </>
        )}
      </Device>

      {!chainMode && (
        <div
          style={{
            marginTop: 18,
            fontSize: 8,
            color: "#666",
            textAlign: "center",
            fontFamily: "monospace",
          }}
        >
          <div>seed: {seed}</div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 6 }}>
            {[7, 42, 99, 142, 200, 255].map((s) => (
              <button
                key={s}
                onClick={() => setSeed(s)}
                style={{
                  background: s === seed ? "#444" : "#222",
                  color: "#aaa",
                  border: "1px solid #444",
                  padding: "2px 6px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 8,
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 6 }}>
            {[
              { l: "happy", s: { hunger: 90, mood: 90, energy: 90 } },
              { l: "sad", s: { hunger: 30, mood: 30, energy: 60 } },
              { l: "crit", s: { hunger: 10, mood: 10, energy: 10 } },
              { l: "dead", s: { hunger: 0, mood: 0, energy: 0 } },
            ].map(({ l, s }) => (
              <button
                key={l}
                onClick={() => setStats(s)}
                style={{
                  background: "#222",
                  color: "#aaa",
                  border: "1px solid #444",
                  padding: "2px 6px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 8,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function BootScreen({ step }: { step: 0 | 1 | 2 | number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 240,
        gap: 12,
        color: "var(--gb-darkest)",
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: 2 }}>
        {step === 0 ? "" : "ZEROGOCHI"}
      </div>
      <div style={{ fontSize: 6, letterSpacing: 1, height: 12 }}>
        {step === 1 ? "* * *" : step >= 2 ? "READY" : ""}
      </div>
    </div>
  );
}
