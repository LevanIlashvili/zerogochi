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
