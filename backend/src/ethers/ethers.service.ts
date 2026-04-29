import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { config } from '../config';
import { FORWARDER_ABI, ZEROGOCHI_ABI } from './abis';

/// Holds the singletons the rest of the app needs:
///   - JsonRpcProvider for 0G mainnet
///   - Relayer Wallet (pays gas)
///   - Forwarder Contract (write via relayer)
///   - Zerogochi Contract (read via provider)
@Injectable()
export class EthersService implements OnModuleInit {
  private readonly log = new Logger(EthersService.name);

  provider!: JsonRpcProvider;
  relayer!: Wallet;
  forwarder!: Contract;
  zerogochi!: Contract;
  zerogochiAsRelayer!: Contract;

  async onModuleInit() {
    this.provider = new JsonRpcProvider(config.rpcUrl, config.chainId, {
      staticNetwork: true,
    });

    if (!config.relayerPk) {
      this.log.warn('RELAYER_PK unset — write paths will fail');
    } else {
      this.relayer = new Wallet(config.relayerPk, this.provider);
      const balance = await this.provider.getBalance(this.relayer.address).catch(() => 0n);
      this.log.log(
        `relayer ${this.relayer.address} balance ${balance.toString()} wei`,
      );
    }

    if (config.forwarder) {
      this.forwarder = new Contract(
        config.forwarder,
        FORWARDER_ABI,
        this.relayer ?? this.provider,
      );
    } else {
      this.log.warn('FORWARDER_ADDRESS unset — relay endpoint disabled');
    }

    if (config.zerogochi) {
      this.zerogochi = new Contract(config.zerogochi, ZEROGOCHI_ABI, this.provider);
      if (this.relayer) {
        this.zerogochiAsRelayer = new Contract(
          config.zerogochi,
          ZEROGOCHI_ABI,
          this.relayer,
        );
      }
    } else {
      this.log.warn('ZEROGOCHI_ADDRESS unset — pet endpoints disabled');
    }
  }
}
