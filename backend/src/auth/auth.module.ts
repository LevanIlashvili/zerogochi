import { Module } from '@nestjs/common';
import { TgInitDataGuard } from './tg-initdata.guard';
import { RateLimitGuard } from './rate-limit.guard';
import { MeController } from './me.controller';

@Module({
  controllers: [MeController],
  providers: [TgInitDataGuard, RateLimitGuard],
  exports: [TgInitDataGuard, RateLimitGuard],
})
export class AuthModule {}
