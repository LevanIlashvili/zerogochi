import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createZGComputeNetworkBroker, ZGComputeNetworkBroker } from '@0gfoundation/0g-compute-ts-sdk';
import OpenAI from 'openai';
import { config } from '../config';
import { EthersService } from '../ethers/ethers.service';

interface ProviderEntry {
  address: string;
  model: string;
}

/**
 * Wraps the 0G Compute broker. Initializes once on boot, fetches the live
 * provider list, picks the configured INFERENCE_MODEL (e.g. "deepseek-chat"),
 * and exposes a single `chat()` call that streams a reply back.
 */
@Injectable()
export class InferenceService implements OnModuleInit {
  private readonly log = new Logger(InferenceService.name);
  private broker: ZGComputeNetworkBroker | null = null;
  private provider: ProviderEntry | null = null;

  constructor(@Inject(EthersService) private readonly eth: EthersService) {}

  async onModuleInit() {
    if (!this.eth.relayer) {
      this.log.warn('relayer wallet missing — inference disabled');
      return;
    }
    try {
      this.broker = await createZGComputeNetworkBroker(this.eth.relayer);
      const services: Array<{ provider: string; model: string }> =
        (await this.broker.inference.listService()) as unknown as Array<{ provider: string; model: string }>;
      const want = config.inferenceModel.toLowerCase();
      const match = services.find((s) => s.model?.toLowerCase().includes(want));
      if (!match) {
        this.log.warn(
          `model "${config.inferenceModel}" not in live providers (${services.map((s) => s.model).join(', ')}); inference disabled`,
        );
        return;
      }
      this.provider = { address: match.provider, model: match.model };
      this.log.log(`inference ready: ${this.provider.model} @ ${this.provider.address}`);
    } catch (err) {
      this.log.error(`broker init failed: ${(err as Error).message}`);
    }
  }

  isReady(): boolean {
    return Boolean(this.broker && this.provider);
  }

  /**
   * Single non-streaming chat. Returns the text reply plus a verified flag
   * indicating the broker was able to verify the TEE-attested signer's
   * signature on the response.
   */
  async chat(prompt: string): Promise<{ reply: string; verified: boolean }> {
    if (!this.broker || !this.provider) {
      throw new Error('inference not ready (provider not selected)');
    }
    const { endpoint, model } = await this.broker.inference.getServiceMetadata(
      this.provider.address,
    );
    const headers = await this.broker.inference.getRequestHeaders(
      this.provider.address,
      prompt,
    );

    const openai = new OpenAI({ baseURL: endpoint, apiKey: '' });
    const completion = await openai.chat.completions.create(
      { model, messages: [{ role: 'user', content: prompt }] },
      { headers: headers as unknown as Record<string, string> },
    );

    const content = completion.choices[0]?.message?.content ?? '';
    let verified = false;
    try {
      const ok = await this.broker.inference.processResponse(
        this.provider.address,
        content,
        completion.id,
      );
      verified = Boolean(ok);
    } catch (err) {
      this.log.warn(`processResponse failed: ${(err as Error).message}`);
    }
    return { reply: content, verified };
  }
}
