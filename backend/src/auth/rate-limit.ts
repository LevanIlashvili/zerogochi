/**
 * In-memory sliding-window rate limiter keyed by tgUserId. Single instance,
 * resets on container restart. Sized for hackathon traffic; swap for redis
 * at scale.
 */
export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
  ) {}

  /** Returns true if the request is allowed (and records it). */
  allow(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  /** How many ms until the next call would be allowed. */
  retryAfterMs(key: string): number {
    const recent = this.hits.get(key) ?? [];
    if (recent.length < this.max) return 0;
    const oldest = recent[0];
    const resetAt = oldest + this.windowMs;
    return Math.max(0, resetAt - Date.now());
  }

  /** Periodic cleanup of stale entries to keep memory bounded. */
  sweep() {
    const cutoff = Date.now() - this.windowMs;
    for (const [k, arr] of this.hits) {
      const live = arr.filter((t) => t > cutoff);
      if (live.length === 0) this.hits.delete(k);
      else this.hits.set(k, live);
    }
  }
}
