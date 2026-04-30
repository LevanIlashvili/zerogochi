import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HistoryService } from './history.service';
import { InferenceService } from './inference.service';
import { TalkController } from './talk.controller';

@Module({
  imports: [AuthModule],
  controllers: [TalkController],
  providers: [HistoryService, InferenceService],
  exports: [InferenceService, HistoryService],
})
export class TalkModule {}
