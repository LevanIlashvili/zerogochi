import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { config } from '../config';
import { verifyInitData, type VerifiedInitData } from './tg-initdata';

declare module 'express' {
  interface Request {
    tg?: VerifiedInitData;
  }
}

/**
 * Reads `X-TG-Init-Data` (or `?initData=`) from each request, verifies it
 * with the bot token, and attaches the parsed payload at `req.tg`. Routes
 * decorated with this guard receive a verified Telegram user.
 */
@Injectable()
export class TgInitDataGuard implements CanActivate {
  private readonly log = new Logger(TgInitDataGuard.name);

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();

    // Dev-mode bypass — strictly off in production. The frontend must also
    // be in dev mode to send these headers, so two locks on the same door.
    if (
      process.env.NODE_ENV !== 'production' &&
      req.header('x-dev-mode') === '1'
    ) {
      const idHeader = req.header('x-dev-user-id');
      const id = idHeader ? Number(idHeader) : NaN;
      if (!Number.isFinite(id) || id <= 0) {
        throw new UnauthorizedException('dev mode missing x-dev-user-id');
      }
      req.tg = {
        user: { id, first_name: 'dev', username: 'dev' },
        authDate: Math.floor(Date.now() / 1000),
        raw: 'dev-mode',
      };
      return true;
    }

    const raw = (req.header('x-tg-init-data') ??
      (req.query.initData as string | undefined) ??
      '') as string;

    if (!raw) throw new UnauthorizedException('missing tg initData');
    if (!config.tgBotToken) {
      this.log.warn('TG_BOT_TOKEN not configured; refusing all requests');
      throw new UnauthorizedException('server tg auth not configured');
    }

    try {
      req.tg = verifyInitData(raw, config.tgBotToken);
    } catch (err) {
      throw new UnauthorizedException(`tg initData invalid: ${(err as Error).message}`);
    }
    return true;
  }
}
