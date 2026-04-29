import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { TgInitDataGuard } from './tg-initdata.guard';

@Controller('api')
@UseGuards(TgInitDataGuard)
export class MeController {
  @Get('me')
  me(@Req() req: Request) {
    const tg = req.tg!;
    return {
      tgUserId: tg.user.id,
      username: tg.user.username,
      authDate: tg.authDate,
    };
  }
}
