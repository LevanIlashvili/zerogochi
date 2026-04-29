import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TgInitDataGuard } from '../auth/tg-initdata.guard';
import { StorageService } from './storage.service';

@Controller('api/storage')
@UseGuards(TgInitDataGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload')
  async upload(@Body() body: { ciphertextB64: string }) {
    const result = await this.storage.upload(body.ciphertextB64);
    return { rootHash: result.rootHash, txHash: result.txHash };
  }
}
