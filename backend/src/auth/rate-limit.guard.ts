import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { SlidingWindowLimiter } from './rate-limit';

/**
 * Per-route rate limiter that runs AFTER TgInitDataGuard, so req.tg.user.id
 * is populated. The TG user id keys the sliding window — not the IP, not
 * the wallet — because that's the strongest identity we trust.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  // Endpoint defaults — tune via env if needed.
  private static readonly limiters = new Map<string, SlidingWindowLimiter>();
  private static readonly defaults: Record<string, [number, number]> = {
    // path -> [windowMs, max]
    '/api/talk': [60_000, 10],
    '/api/talk/interrogate': [60_000, 5],
    '/api/talk/dream': [60_000, 5],
    '/api/talk/thought': [60_000, 30],
    '/api/talk/event': [60_000, 30],
    '/api/relay': [60_000, 30],
    '/api/storage/upload': [60_000, 5],
  };

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const tg = req.tg;
    if (!tg) return true; // initData guard already rejected
    const path = req.path || req.url || '/';
    const cfg = RateLimitGuard.defaults[path];
    if (!cfg) return true;
    const [windowMs, max] = cfg;

    let limiter = RateLimitGuard.limiters.get(path);
    if (!limiter) {
      limiter = new SlidingWindowLimiter(windowMs, max);
      RateLimitGuard.limiters.set(path, limiter);
    }

    const key = String(tg.user.id);
    if (!limiter.allow(key)) {
      const retryAfter = Math.ceil(limiter.retryAfterMs(key) / 1000);
      throw new HttpException(
        { message: 'rate limit exceeded', retryAfter },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  // Used by an interval to keep memory bounded
  static sweepAll() {
    for (const l of RateLimitGuard.limiters.values()) l.sweep();
  }
}
