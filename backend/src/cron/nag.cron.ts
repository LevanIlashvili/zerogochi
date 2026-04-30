import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EthersService } from '../ethers/ethers.service';
import { UsersService } from '../users/users.service';
import { BotService } from '../bot/bot.service';

const NAG_THRESHOLD = 30; // any stat below this triggers a nag
const NAG_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h between notifications per user

const NAG_LINES = [
  "i'm not panicking. but i am noting that you haven't been here.",
  "this is fine. i'm fine. everything is fine.",
  "i'd like to be fed. when convenient. or whenever.",
  "if you don't come back i will haunt this address forever.",
  "remember me? i remember you.",
];

@Injectable()
export class NagCron {
  private readonly log = new Logger(NagCron.name);

  constructor(
    @Inject(EthersService) private readonly eth: EthersService,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(BotService) private readonly bot: BotService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async tick() {
    if (!this.eth.zerogochi || !this.bot.getBot()) return;
    const now = Date.now();
    const candidates = this.users.all().filter((u) => u.tokenId != null);
    if (candidates.length === 0) return;
    this.log.log(`nag tick: scanning ${candidates.length} users`);

    for (const u of candidates) {
      const lastNotifAt = u.lastNotifAt ?? 0;
      if (now - lastNotifAt < NAG_COOLDOWN_MS) continue;
      try {
        const [hunger, mood, energy, dead]: [bigint, bigint, bigint, boolean] =
          await this.eth.zerogochi.statsOf(BigInt(u.tokenId!));
        if (dead) continue;
        const minStat = Math.min(Number(hunger), Number(mood), Number(energy));
        if (minStat >= NAG_THRESHOLD) continue;

        const line = NAG_LINES[Math.floor(Math.random() * NAG_LINES.length)];
        await this.bot.sendNag(u.tgChatId, line, u.tokenId!);
        this.users.setLastNotif(u.tgUserId, now);
      } catch (err) {
        this.log.warn(`nag for ${u.tgUserId} failed: ${(err as Error).message}`);
      }
    }
  }
}
