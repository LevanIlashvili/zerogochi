import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { TgInitDataGuard } from '../auth/tg-initdata.guard';
import { EthersService } from '../ethers/ethers.service';

@Controller('api/pet')
@UseGuards(TgInitDataGuard)
export class PetController {
  // Memo of birth timestamp by tokenId — bornAt never changes, no need to
  // re-read events on every request.
  private bornAtCache = new Map<number, number>();
  private minterCache = new Map<number, string>();

  constructor(@Inject(EthersService) private readonly eth: EthersService) {}

  /// Returns the (tokenId, exists) pair for an address, plus current stats
  /// when a pet exists. The mini-app polls this after relaying a mint to
  /// pick up its assigned tokenId.
  @Get('mine')
  async mine(@Query('address') address: string) {
    if (!this.eth.zerogochi) throw new ServiceUnavailableException('zerogochi not configured');
    if (!address) throw new ServiceUnavailableException('missing ?address');

    const [tokenId, exists]: [bigint, boolean] = await this.eth.zerogochi.petOf(address);
    if (!exists) {
      return { tokenId: 0, exists: false };
    }
    const [hunger, mood, energy, dead]: [bigint, bigint, bigint, boolean] =
      await this.eth.zerogochi.statsOf(tokenId);
    const bornAt = await this.bornAtFor(Number(tokenId));
    const minter = await this.minterOf(Number(tokenId));
    const inherited =
      minter !== null && minter.toLowerCase() !== address.toLowerCase();
    return {
      tokenId: Number(tokenId),
      exists: true,
      hunger: Number(hunger),
      mood: Number(mood),
      energy: Number(energy),
      dead,
      bornAt,
      minter,
      inherited,
    };
  }

  @Get(':tokenId')
  async byId(@Param('tokenId') tokenId: string) {
    if (!this.eth.zerogochi) throw new ServiceUnavailableException('zerogochi not configured');
    const id = BigInt(tokenId);
    const [hunger, mood, energy, dead]: [bigint, bigint, bigint, boolean] =
      await this.eth.zerogochi.statsOf(id);
    const bornAt = await this.bornAtFor(Number(id));
    return {
      tokenId: Number(id),
      hunger: Number(hunger),
      mood: Number(mood),
      energy: Number(energy),
      dead,
      bornAt,
    };
  }

  private async bornAtFor(tokenId: number): Promise<number | null> {
    const cached = this.bornAtCache.get(tokenId);
    if (cached !== undefined) return cached;
    await this.fetchBornEvent(tokenId);
    const after = this.bornAtCache.get(tokenId);
    return after ?? null;
  }

  private async minterOf(tokenId: number): Promise<string | null> {
    const cached = this.minterCache.get(tokenId);
    if (cached !== undefined) return cached;
    await this.fetchBornEvent(tokenId);
    const after = this.minterCache.get(tokenId);
    return after ?? null;
  }

  private async fetchBornEvent(tokenId: number): Promise<void> {
    try {
      const provider = this.eth.provider;
      const head = await provider.getBlockNumber();
      const fromBlock = Math.max(0, head - 200_000);
      const filter = this.eth.zerogochi.filters.Born(BigInt(tokenId));
      const logs = await this.eth.zerogochi.queryFilter(filter, fromBlock, head);
      if (logs.length === 0) return;
      const parsed = this.eth.zerogochi.interface.parseLog({
        topics: logs[0].topics as string[],
        data: logs[0].data,
      });
      const at = Number(parsed?.args?.at ?? 0);
      const owner = String(parsed?.args?.owner ?? '');
      this.bornAtCache.set(tokenId, at);
      if (owner) this.minterCache.set(tokenId, owner);
    } catch {
      // ignore
    }
  }
}
