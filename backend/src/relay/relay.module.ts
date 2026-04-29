import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RelayController } from './relay.controller';

@Module({
  imports: [AuthModule],
  controllers: [RelayController],
})
export class RelayModule {}
