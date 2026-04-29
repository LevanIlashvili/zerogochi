import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Indexer, MemData } from '@0glabs/0g-ts-sdk';
import { config } from '../config';
import { EthersService } from '../ethers/ethers.service';

@Injectable()
export class StorageService {
  private readonly log = new Logger(StorageService.name);
  private indexer: Indexer | null = null;

  constructor(private readonly eth: EthersService) {}

  private getIndexer(): Indexer {
    if (!this.indexer) this.indexer = new Indexer(config.storageIndexerUrl);
    return this.indexer;
  }

  /**
   * Upload a base64-encoded encrypted blob to 0G Storage. Returns the
   * content-addressed root hash, which the frontend embeds in the
   * personality URI committed on-chain at mint.
   */
  async upload(ciphertextB64: string): Promise<{ rootHash: string; txHash: string }> {
    if (!this.eth.relayer) {
      throw new ServiceUnavailableException('relayer not configured (no OG to pay for upload)');
    }
    const bytes = Buffer.from(ciphertextB64, 'base64');
    if (bytes.length === 0) throw new ServiceUnavailableException('empty blob');
    if (bytes.length > 32 * 1024) throw new ServiceUnavailableException('blob too large (32KB max)');

    const file = new MemData(bytes);
    const indexer = this.getIndexer();
    const [result, err] = await indexer.upload(file, config.rpcUrl, this.eth.relayer);
    if (err) {
      this.log.error(`storage upload failed: ${err.message}`);
      throw new ServiceUnavailableException(`storage upload: ${err.message}`);
    }
    this.log.log(`uploaded ${bytes.length} bytes -> ${result.rootHash}`);
    return result;
  }
}
