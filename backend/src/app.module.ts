import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { EthersModule } from './ethers/ethers.module';
import { RelayModule } from './relay/relay.module';
import { PetModule } from './pet/pet.module';

@Module({
  imports: [ScheduleModule.forRoot(), EthersModule, AuthModule, RelayModule, PetModule],
  controllers: [HealthController],
})
export class AppModule {}
