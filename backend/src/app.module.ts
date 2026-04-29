import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { EthersModule } from './ethers/ethers.module';
import { RelayModule } from './relay/relay.module';

@Module({
  imports: [ScheduleModule.forRoot(), EthersModule, AuthModule, RelayModule],
  controllers: [HealthController],
})
export class AppModule {}
