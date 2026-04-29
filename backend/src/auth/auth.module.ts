import { Module } from '@nestjs/common';
import { TgInitDataGuard } from './tg-initdata.guard';
import { MeController } from './me.controller';

@Module({
  controllers: [MeController],
  providers: [TgInitDataGuard],
  exports: [TgInitDataGuard],
})
export class AuthModule {}
