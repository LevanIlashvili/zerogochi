"use client";

import { useEffect, useRef, useState } from "react";
import { Device } from "./Device";
import { StatBars } from "./StatBars";
import { Buttons, type ButtonKind } from "./Buttons";
import { TalkChat } from "./TalkChat";
import { ThoughtBubble } from "./ThoughtBubble";
import moodStyles from "./SpriteMood.module.css";
import { AnimatedSprite, type AnimatedSpriteHandle } from "@/sprite/AnimatedSprite";
import { lookFromSeed } from "@/sprite/types";
import { statFromValues } from "@/sprite/states";
import { stageFor } from "@/sprite/stages";
import { BEEPS } from "@/lib/beep";
import { loadOrCreateWallet, type ZgWallet } from "@/lib/wallet";
import { isOnchainConfigured, onchain } from "@/lib/actions";
import { api, BackendError, setDevAddress } from "@/lib/api";
import { isDevMode } from "@/lib/devMode";
import { loadCachedPersonality } from "@/lib/personalityCache";
import type { Personality } from "@/lib/personality";
import { createPet } from "@/lib/createPet";

interface Stats {
  hunger: number;
  mood: number;
  energy: number;
}

type Phase = "boot" | "hydrating" | "noPet" | "live" | "minting" | "error";

const POLL_MS = 12_000;

export function Pet() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [bootStep, setBootStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [wallet, setWallet] = useState<ZgWallet | null>(null);
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>({ hunger: 100, mood: 100, energy: 100 });
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [busy, setBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [seed, setSeed] = useState<number>(0);
  const [tx, setTx] = useState<{ kind: "feed" | "play" | "mint"; phase: "signing" | "onchain" | "done"; hash?: string } | null>(null);
  const [thought, setThought] = useState<string | null>(null);
  const [bornAt, setBornAt] = useState<number | null>(null);
  const [inherited, setInherited] = useState<boolean>(false);
  const spriteRef = useRef<AnimatedSpriteHandle | null>(null);
  const look = lookFromSeed(seed);
  const state = phase === "live" ? statFromValues(stats.hunger, stats.mood, stats.energy) : "happy";

  // Boot sequence — splash for ~1.3s while we hydrate
  useEffect(() => {
    const t1 = window.setTimeout(() => setBootStep(1), 280);
    const t2 = window.setTimeout(() => setBootStep(2), 700);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  // Hydrate wallet + pet on first mount
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!isOnchainConfigured()) {
        if (!cancel) {
          setErrorMsg("contracts not configured (env)");
          setPhase("error");
        }
        return;
      }
      setPhase("hydrating");
      try {
        const w = await loadOrCreateWallet();
        if (cancel) return;
        setWallet(w);
        setDevAddress(w.address);

        // Tell the backend who we are so the nag cron can find us. Best-effort.
        try {
          await api.register({ address: w.address });
        } catch (e) {
          if (!(e instanceof BackendError) || e.status !== 401) {
            // 401 is expected outside Telegram + dev mode; anything else is noisy
            // eslint-disable-next-line no-console
            console.warn("register skipped:", e);
          }
        }

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
          setBornAt(pet.bornAt ?? null);
          setInherited(!!pet.inherited);
          const cached = await loadCachedPersonality();
          if (cached) setPersonality(cached);
          setPhase("live");
        } else {
          setPhase("noPet");
        }
      } catch (err) {
        if (cancel) return;
        const msg = err instanceof BackendError ? `backend: ${err.status}` : (err as Error).message;
        setErrorMsg(msg);
        setPhase("error");
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Pet thinks out loud — every 60-120s while live, chat closed, no thought
  // currently visible. Each thought is a real DeepSeek call through 0G.
  useEffect(() => {
    if (phase !== "live" || chatOpen || !personality || tokenId == null) return;
    let cancelled = false;
    let timer: number | null = null;

    function scheduleNext() {
      const wait = 60_000 + Math.random() * 60_000;
      timer = window.setTimeout(async () => {
        if (cancelled) return;
        // 70% chance: random thought. 30%: random life event. Both surface
        // in the same bubble; they just feel different in tone.
        const useEvent = Math.random() < 0.3;
        const call = useEvent ? api.event : api.thought;
        try {
          const result = await call({
            tokenId: tokenId!,
            personality: {
              voice: personality!.voice,
              hungerDecayRate: personality!.hungerDecayRate,
              moodDecayRate: personality!.moodDecayRate,
              energyDecayRate: personality!.energyDecayRate,
            },
          });
          if (cancelled) return;
          if (result.reply.trim()) {
            setThought(result.reply.trim().toLowerCase());
          }
        } catch {
          // silent — autonomous bubbles are best-effort
        }
        scheduleNext();
      }, wait);
    }
    scheduleNext();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [phase, chatOpen, personality, tokenId]);

  // On-chain stat refresh while live
  useEffect(() => {
    if (phase !== "live" || !wallet) return;
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
        // tolerate transient errors
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [phase, wallet]);

  async function refreshStats(addr: string) {
    try {
      const pet = await api.myPet(addr);
      if (pet.exists)
        setStats({ hunger: pet.hunger ?? 0, mood: pet.mood ?? 0, energy: pet.energy ?? 0 });
    } catch {
      // silent
    }
  }

  async function doMint() {
    if (!wallet || busy) return;
    setBusy(true);
    setPhase("minting");
    BEEPS.btnA();
    try {
      const result = await createPet(wallet);
      setTokenId(0); // The Born event gives us the actual id; we re-fetch below.
      setPersonality(result.personality);
      // Discover our actual tokenId via a chain read.
      const pet = await api.myPet(wallet.address);
      if (pet.exists) {
        setTokenId(pet.tokenId);
        setSeed(pet.tokenId & 0xff);
        setStats({
          hunger: pet.hunger ?? 100,
          mood: pet.mood ?? 100,
          energy: pet.energy ?? 100,
        });
        setBornAt(pet.bornAt ?? null);
      }
      // Update backend so cron knows our tokenId.
      try {
        await api.register({ address: wallet.address, tokenId: pet.tokenId });
      } catch {
        // best-effort
      }
      setPhase("live");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }

  async function handle(kind: ButtonKind) {
    if (busy || phase !== "live" || !wallet || tokenId == null) return;
    setBusy(true);
    try {
      if (kind === "A") {
        BEEPS.btnA();
        window.setTimeout(BEEPS.eat, 100);
        spriteRef.current?.triggerReaction("heart");
        // Pet stays in eating animation until tx confirms
        spriteRef.current?.startHoldAction("eating");
        setTx({ kind: "feed", phase: "signing" });
        try {
          const result = await onchain.feed(wallet, tokenId);
          setTx({ kind: "feed", phase: "done", hash: result.txHash });
          await refreshStats(wallet.address);
        } finally {
          spriteRef.current?.stopHoldAction();
        }
        // Auto-clear toast after 5s
        window.setTimeout(() => setTx((t) => (t?.kind === "feed" ? null : t)), 5000);
      } else if (kind === "B") {
        BEEPS.btnB();
        window.setTimeout(BEEPS.play, 100);
        spriteRef.current?.triggerReaction("star");
        spriteRef.current?.startHoldAction("playing");
        setTx({ kind: "play", phase: "signing" });
        try {
          const result = await onchain.play(wallet, tokenId);
          setTx({ kind: "play", phase: "done", hash: result.txHash });
          await refreshStats(wallet.address);
        } finally {
          spriteRef.current?.stopHoldAction();
        }
        window.setTimeout(() => setTx((t) => (t?.kind === "play" ? null : t)), 5000);
      } else {
        BEEPS.btnC();
        await spriteRef.current?.triggerAction("talking");
        // Talk button just opens the chat overlay; the actual conversation
        // (including sending logSpoke txs and inference calls) happens inside.
        if (personality) {
          setChatOpen(true);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("action failed:", err);
    } finally {
      setBusy(false);
    }
  }

  const dev = isDevMode();
  const addrShort = wallet ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "...";

  return (
    <>
      <Device
        controls={
          phase === "live" ? (
            <Buttons onPress={handle} disabled={busy} />
          ) : phase === "noPet" ? (
            <MintControls onMint={doMint} busy={busy} />
          ) : null
        }
        footer={
          <>
            <div>
              {phase === "live" ? "live · 0g mainnet" : phaseLabel(phase)}
              {dev ? " · dev" : ""}
              {inherited ? " · inherited" : ""}
            </div>
            <div>{addrShort}</div>
          </>
        }
      >
        {phase === "boot" || phase === "hydrating" ? (
          <BootScreen step={bootStep} label={phase === "hydrating" ? "READING CHAIN" : "READY"} />
        ) : phase === "error" ? (
          <ErrorScreen message={errorMsg ?? "unknown"} />
        ) : phase === "noPet" ? (
          <EggScreen />
        ) : phase === "minting" ? (
          <BootScreen step={2} label="HATCHING..." />
        ) : (
          <>
            <StatBars {...stats} />
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0", position: "relative", minHeight: 200 }}>
              {thought && (
                <ThoughtBubble text={thought} onDone={() => setThought(null)} ttl={6000} />
              )}
              <span className={`${moodStyles.wrap} ${moodClass(personality)}`}>
                <AnimatedSprite ref={spriteRef} look={look} state={state} scale={Math.round(8 * stageFor(bornAt).scaleMul)} />
              </span>
            </div>
            <div
              className="prose"
              style={{
                color: "var(--gb-darkest)",
                marginTop: 10,
                lineHeight: 1.2,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>#{String(tokenId ?? 0).padStart(4, "0")}</span>
                <span>{stageFor(bornAt).label} · {stageFor(bornAt).ageStr}</span>
              </div>
              {personality?.name && (
                <div style={{ opacity: 0.85 }}>{personality.name.toLowerCase()}</div>
              )}
            </div>
          </>
        )}
      </Device>

      {tx && <TxToast tx={tx} />}

      {chatOpen && wallet && tokenId != null && personality && (
        <TalkChat
          tokenId={tokenId}
          wallet={wallet}
          personality={personality}
          inherited={inherited}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
}

function TxToast({ tx }: { tx: { kind: "feed" | "play" | "mint"; phase: "signing" | "onchain" | "done"; hash?: string } }) {
  const verbBy = { feed: "FEEDING", play: "PLAYING", mint: "MINTING" } as const;
  const verb = verbBy[tx.kind];
  const label =
    tx.phase === "signing"
      ? `${verb}... · signing`
      : tx.phase === "onchain"
        ? `${verb}... · onchain`
        : `${verb} · ✓`;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--gb-darkest)",
        color: "var(--gb-lightest)",
        border: "2px solid var(--gb-light)",
        padding: "10px 16px",
        fontFamily: "var(--font-pixel-prose), var(--font-pixel), monospace",
        fontSize: 14,
        letterSpacing: 0.5,
        boxShadow: "0 4px 0 0 #000",
        zIndex: 90,
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <span>{label}</span>
      {tx.hash && (
        <a
          href={`https://chainscan.0g.ai/tx/${tx.hash}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--gb-light)", textDecoration: "underline" }}
        >
          tx
        </a>
      )}
    </div>
  );
}

/** Pick the dominant personality trait that warrants a visual flair. */
function moodClass(p: Personality | null): string {
  if (!p) return "";
  const v = p.vector;
  // Trigger threshold: 180 of 255 — the trait must be clearly dominant
  const candidates: Array<[number, string]> = [
    [v.anxious, moodStyles.anxious],
    [v.dramatic, moodStyles.dramatic],
    [v.vain, moodStyles.vain],
    [v.cynical, moodStyles.cynical],
  ];
  candidates.sort((a, b) => b[0] - a[0]);
  return candidates[0][0] >= 180 ? candidates[0][1] : "";
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case "boot":
    case "hydrating":
      return "booting";
    case "noPet":
      return "ready to mint";
    case "minting":
      return "minting...";
    case "error":
      return "offline";
    default:
      return "";
  }
}

function BootScreen({ step, label }: { step: number; label?: string }) {
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
        {step === 1 ? "* * *" : step >= 2 ? (label ?? "READY") : ""}
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 240,
        gap: 10,
        color: "var(--gb-darkest)",
        padding: 12,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: 2 }}>ERROR</div>
      <div className="prose" style={{ maxWidth: 240 }}>
        {message}
      </div>
    </div>
  );
}

function EggScreen() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 240,
        gap: 14,
        color: "var(--gb-darkest)",
      }}
    >
      <Egg />
      <div style={{ fontSize: 8, letterSpacing: 1.5 }}>UNCLAIMED</div>
      <div className="prose" style={{ opacity: 0.85 }}>
        tap MINT to hatch
      </div>
    </div>
  );
}

function Egg() {
  // pixel egg, 14x18 grid
  const grid = [
    "    oooooo    ",
    "  oo######oo  ",
    " o##########o ",
    " o##########o ",
    "o############o",
    "o############o",
    "o############o",
    "o############o",
    "o############o",
    "o##oo####oo##o",
    "o############o",
    "o############o",
    "o############o",
    " o##########o ",
    " o##########o ",
    "  oo######oo  ",
    "    oooooo    ",
    "              ",
  ];
  const W = 14, H = 18, S = 6;
  const rects: React.ReactElement[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = grid[y][x];
      if (c === " ") continue;
      const fill = c === "o" ? "var(--gb-darkest)" : "var(--gb-light)";
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />);
    }
  }
  return (
    <svg
      width={W * S}
      height={H * S}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated" }}
    >
      {rects}
    </svg>
  );
}

function MintControls({ onMint, busy }: { onMint: () => void; busy: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
      <button
        onClick={onMint}
        disabled={busy}
        style={{
          fontFamily: "inherit",
          fontSize: 10,
          letterSpacing: 2,
          padding: "12px 36px",
          background: "linear-gradient(180deg, #4a4a4a 0%, #2c2c2c 100%)",
          color: "#fff",
          border: "3px solid #000",
          borderRadius: 8,
          cursor: busy ? "not-allowed" : "pointer",
          boxShadow: busy ? "0 1px 0 #000" : "0 6px 0 0 #000",
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? "..." : "MINT"}
      </button>
    </div>
  );
}

