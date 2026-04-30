import { Module } from '@nestjs/common';
import { NagCron } from './nag.cron';

@Module({
  providers: [NagCron],
})
export class CronModule {}
