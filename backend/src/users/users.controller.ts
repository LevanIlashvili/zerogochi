import { Body, Controller, Inject, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { TgInitDataGuard } from '../auth/tg-initdata.guard';
import { UsersService } from './users.service';

@Controller('api')
@UseGuards(TgInitDataGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  /**
   * Mini-app posts here on first launch with its derived wallet address so
   * the backend can ping the user when stats drop.
   */
  @Post('register')
  register(@Req() req: Request, @Body() body: { address: string; tokenId?: number; chatId?: number }) {
    const tg = req.tg!;
    this.users.upsert({
      tgUserId: tg.user.id,
      tgChatId: body.chatId ?? tg.user.id, // private chats use user id as chat id
      address: body.address,
      tokenId: body.tokenId,
    });
    return { ok: true };
  }
}
