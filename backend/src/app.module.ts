import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { EthersModule } from './ethers/ethers.module';
import { RelayModule } from './relay/relay.module';
import { PetModule } from './pet/pet.module';
import { StorageModule } from './storage/storage.module';
import { TalkModule } from './talk/talk.module';
import { BotModule } from './bot/bot.module';
import { UsersModule } from './users/users.module';
import { CronModule } from './cron/cron.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EthersModule,
    AuthModule,
    UsersModule,
    BotModule,
    RelayModule,
    PetModule,
    StorageModule,
    TalkModule,
    CronModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
