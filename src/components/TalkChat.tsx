"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./TalkChat.module.css";
import { BEEPS } from "@/lib/beep";
import { api, BackendError } from "@/lib/api";
import { logSpokeOnChain } from "@/lib/onchainSpeak";
import type { Personality } from "@/lib/personality";
import type { ZgWallet } from "@/lib/wallet";

interface Props {
  tokenId: number;
  wallet: ZgWallet;
  personality: Personality;
  inherited?: boolean;
  onClose: () => void;
}

interface Message {
  role: "user" | "pet";
  content: string;
  /// True while the typewriter is still writing — used by the renderer to
  /// add the trailing underscore cursor.
  typing?: boolean;
  verified?: boolean;
  txHash?: string;
}

const SUGGESTIONS = [
  "how have you been?",
  "do you trust me?",
  "what do you remember?",
  "are you mad at me?",
];

const TYPE_INTERVAL_MS = 32;
const STORAGE_KEY = (tokenId: number) => `zerogochi:chat:${tokenId}`;

export function TalkChat({ tokenId, wallet, personality, inherited, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => loadHistory(tokenId));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Persist history per pet
  useEffect(() => {
    saveHistory(tokenId, messages);
  }, [tokenId, messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    BEEPS.btnC();
    setBusy(true);

    const userMsg: Message = { role: "user", content: trimmed };
    const placeholder: Message = { role: "pet", content: "", typing: true };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setInput("");

    // Fire-and-forget on-chain logSpoke (provable history)
    void logSpokeOnChain(wallet, tokenId, trimmed).then((tx) => {
      if (!tx) return;
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 2 ? { ...m, txHash: tx } : m)),
      );
    });

    try {
      // Send last 8 turns as context (excluding the just-added placeholder)
      const recent = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await api.talk({
        tokenId,
        userMessage: trimmed,
        recent,
        personality: {
          voice: personality.voice,
          hungerDecayRate: personality.hungerDecayRate,
          moodDecayRate: personality.moodDecayRate,
          energyDecayRate: personality.energyDecayRate,
        },
        inherited,
      });

      // Typewriter the reply into the placeholder
      const reply = stripQuotes(result.reply);
      await typewriter(reply, (partial) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "pet",
            content: partial,
            typing: partial.length < reply.length,
            verified: result.verified,
          };
          return next;
        });
      });
    } catch (err) {
      const msg =
        err instanceof BackendError
          ? `(backend ${err.status})`
          : `(error: ${(err as Error).message})`;
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "pet",
          content: `... something went wrong ${msg}`,
        };
        return next;
      });
    } finally {
      setBusy(false);
      // Refocus so user can type next message immediately
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function clearChat() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY(tokenId));
  }

  async function dream() {
    if (busy) return;
    BEEPS.btnC();
    setBusy(true);

    const userMsg: Message = { role: "user", content: "what did you dream?" };
    const placeholder: Message = { role: "pet", content: "", typing: true };
    setMessages((prev) => [...prev, userMsg, placeholder]);

    try {
      const result = await api.dream({
        tokenId,
        personality: {
          voice: personality.voice,
          hungerDecayRate: personality.hungerDecayRate,
          moodDecayRate: personality.moodDecayRate,
          energyDecayRate: personality.energyDecayRate,
        },
      });
      const reply = stripQuotes(result.reply);
      await typewriter(reply, (partial) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "pet",
            content: partial,
            typing: partial.length < reply.length,
            verified: result.verified,
          };
          return next;
        });
      });
    } catch (err) {
      const msg =
        err instanceof BackendError ? `(backend ${err.status})` : `(error: ${(err as Error).message})`;
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "pet",
          content: `... it doesn't remember the dream ${msg}`,
        };
        return next;
      });
    } finally {
      setBusy(false);
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  /// Interrogate the pet — fetches its on-chain history and asks for an
  /// honest reflection. Shows the question as a synthetic user message so
  /// the chat reads naturally.
  async function interrogate() {
    if (busy) return;
    BEEPS.btnC();
    setBusy(true);

    const userMsg: Message = {
      role: "user",
      content: "tell me — honestly — what do you think of how i've treated you?",
    };
    const placeholder: Message = { role: "pet", content: "", typing: true };
    setMessages((prev) => [...prev, userMsg, placeholder]);

    try {
      const result = await api.interrogate({
        tokenId,
        personality: {
          voice: personality.voice,
          hungerDecayRate: personality.hungerDecayRate,
          moodDecayRate: personality.moodDecayRate,
          energyDecayRate: personality.energyDecayRate,
        },
      });
      const reply = stripQuotes(result.reply);
      await typewriter(reply, (partial) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "pet",
            content: partial,
            typing: partial.length < reply.length,
            verified: result.verified,
          };
          return next;
        });
      });
    } catch (err) {
      const msg =
        err instanceof BackendError
          ? `(backend ${err.status})`
          : `(error: ${(err as Error).message})`;
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "pet",
          content: `... it doesn't want to answer ${msg}`,
        };
        return next;
      });
    } finally {
      setBusy(false);
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <span className={styles.title}>{personality.name.toLowerCase()} · #{String(tokenId).padStart(4, "0")}</span>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn} onClick={clearChat} title="clear">
              CLR
            </button>
            <button className={styles.iconBtn} onClick={onClose} title="close">
              X
            </button>
          </div>
        </header>

        <div className={styles.list} ref={listRef}>
          {messages.length === 0 && (
            <div className={`${styles.hint} prose`}>
              say something. it remembers.
            </div>
          )}
          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}
        </div>

        {messages.length === 0 && (
          <div className={styles.chips}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className={`${styles.chip} prose`}
                disabled={busy}
                onClick={() => send(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className={styles.actionBar}>
          <button
            className={`${styles.actionBtn} ${styles.dreamBtn}`}
            onClick={dream}
            disabled={busy}
            title="ask the pet what it dreamed"
          >
            DREAM
          </button>
          <button
            className={`${styles.actionBtn} ${styles.interrogateBtn}`}
            onClick={interrogate}
            disabled={busy}
            title="ask the pet to judge you using its on-chain history"
          >
            JUDGE
          </button>
        </div>

        <form
          className={styles.composer}
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            ref={inputRef}
            className={`${styles.input} prose`}
            placeholder={busy ? "thinking..." : "say something..."}
            value={input}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            maxLength={300}
          />
          <button type="submit" className={styles.sendBtn} disabled={busy || !input.trim()}>
            SEND
          </button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const cls = message.role === "user" ? styles.bubbleUser : styles.bubblePet;
  return (
    <div className={`${styles.bubbleRow} ${message.role === "user" ? styles.rowUser : styles.rowPet}`}>
      <div className={`${cls} prose`}>
        {message.content}
        {message.typing && <span className={styles.cursor}>_</span>}
      </div>
      {(message.verified !== undefined || message.txHash) && (
        <div className={styles.meta}>
          {message.verified !== undefined && (
            <span>{message.verified ? "tee verified" : "tee unverified"}</span>
          )}
          {message.txHash && (
            <a
              className={styles.metaLink}
              href={`https://chainscan.0g.ai/tx/${message.txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              onchain
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function stripQuotes(s: string): string {
  return s.trim().replace(/^["'`]+|["'`]+$/g, "");
}

function typewriter(full: string, onUpdate: (partial: string) => void): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      onUpdate(full.slice(0, i));
      if (i % 2 === 0) BEEPS.talk();
      if (i >= full.length) {
        window.clearInterval(id);
        resolve();
      }
    }, TYPE_INTERVAL_MS);
  });
}

function loadHistory(tokenId: number): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY(tokenId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[];
    // Strip the typing flag if any persisted
    return parsed.map((m) => ({ ...m, typing: false }));
  } catch {
    return [];
  }
}

function saveHistory(tokenId: number, messages: Message[]) {
  try {
    // Don't save in-progress typing
    const clean = messages.map((m) => ({ ...m, typing: false }));
    window.localStorage.setItem(STORAGE_KEY(tokenId), JSON.stringify(clean));
  } catch {
    // tolerate quota / private mode
  }
}
