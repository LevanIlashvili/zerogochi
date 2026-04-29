import {
  Controller,
  Get,
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
  constructor(private readonly eth: EthersService) {}

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
    return {
      tokenId: Number(tokenId),
      exists: true,
      hunger: Number(hunger),
      mood: Number(mood),
      energy: Number(energy),
      dead,
    };
  }

  @Get(':tokenId')
  async byId(@Param('tokenId') tokenId: string) {
    if (!this.eth.zerogochi) throw new ServiceUnavailableException('zerogochi not configured');
    const id = BigInt(tokenId);
    const [hunger, mood, energy, dead]: [bigint, bigint, bigint, boolean] =
      await this.eth.zerogochi.statsOf(id);
    return {
      tokenId: Number(id),
      hunger: Number(hunger),
      mood: Number(mood),
      energy: Number(energy),
      dead,
    };
  }
}
