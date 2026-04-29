import { Controller, Get } from '@nestjs/common';
import { config } from './config';

@Controller('api')
export class HealthController {
  @Get('health')
  health() {
    return { ok: true, ts: Date.now(), chainId: config.chainId };
  }
}
