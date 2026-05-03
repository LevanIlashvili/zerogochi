import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Inject,
  Logger,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { TgInitDataGuard } from '../auth/tg-initdata.guard';
import { RateLimitGuard } from '../auth/rate-limit.guard';
import { EthersService } from '../ethers/ethers.service';
import { config } from '../config';

interface ForwardRequest {
  from: string;
  to: string;
  value: string; // decimal string
  gas: string; // decimal string
  deadline: number;
  data: string; // 0x-prefixed
  signature: string; // 0x-prefixed
}

// Selectors of allowed Zerogochi calls. Anything else MUST NOT be relayed,
// or the relayer becomes a free oracle paying gas for arbitrary signed reqs.
const ALLOWED_SELECTORS = new Set<string>([
  '0xd9971fc9', // mintPet(bytes[],string[],uint8,uint8,uint8,uint8)
  '0xf59dfdfb', // feed(uint256)
  '0x6898f82b', // play(uint256)
  '0xe846cd06', // logSpoke(uint256,bytes32)
]);

@Controller('api')
@UseGuards(TgInitDataGuard, RateLimitGuard)
export class RelayController {
  private readonly log = new Logger(RelayController.name);

  constructor(@Inject(EthersService) private readonly eth: EthersService) {}

  @Post('relay')
  @HttpCode(200)
  async relay(@Body() body: { request: ForwardRequest }) {
    if (!this.eth.forwarder) {
      throw new ServiceUnavailableException('forwarder not configured');
    }
    const r = body.request;
    if (!r) throw new ServiceUnavailableException('missing request');

    // Enforce destination + function whitelist. The forwarder verifies the
    // user's signature, but signature alone doesn't constrain what call is
    // being relayed — without these checks, a malicious frontend could trick
    // the relayer into paying gas for arbitrary contract calls.
    if (config.zerogochi && r.to.toLowerCase() !== config.zerogochi.toLowerCase()) {
      throw new ForbiddenException('relay target not allowed');
    }
    const selector = (r.data || '').slice(0, 10).toLowerCase();
    if (!ALLOWED_SELECTORS.has(selector)) {
      throw new ForbiddenException(`relay function not allowed: ${selector}`);
    }

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
    this.log.log(`relayed ${r.from} -> ${r.to} sel=${selector} (tx ${tx.hash})`);
    return {
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }
}
