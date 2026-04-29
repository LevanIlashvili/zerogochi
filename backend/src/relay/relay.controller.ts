import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { TgInitDataGuard } from '../auth/tg-initdata.guard';
import { EthersService } from '../ethers/ethers.service';

interface ForwardRequest {
  from: string;
  to: string;
  value: string; // decimal string
  gas: string; // decimal string
  deadline: number;
  data: string; // 0x-prefixed
  signature: string; // 0x-prefixed
}

@Controller('api')
@UseGuards(TgInitDataGuard)
export class RelayController {
  private readonly log = new Logger(RelayController.name);

  constructor(private readonly eth: EthersService) {}

  @Post('relay')
  @HttpCode(200)
  async relay(@Body() body: { request: ForwardRequest }) {
    if (!this.eth.forwarder) {
      throw new ServiceUnavailableException('forwarder not configured');
    }
    const r = body.request;
    if (!r) throw new ServiceUnavailableException('missing request');

    // The forwarder verifies signature + nonce + deadline; we just submit.
    const tx = await this.eth.forwarder.execute({
      from: r.from,
      to: r.to,
      value: BigInt(r.value),
      gas: BigInt(r.gas),
      deadline: r.deadline,
      data: r.data,
      signature: r.signature,
    });

    const receipt = await tx.wait();
    this.log.log(`relayed ${r.from} -> ${r.to} (tx ${tx.hash})`);
    return {
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }
}
