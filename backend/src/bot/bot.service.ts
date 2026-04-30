import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Bot, InlineKeyboard } from 'grammy';
import { config } from '../config';
import { EthersService } from '../ethers/ethers.service';

const HELP = `
🥚 zerogochi — 8-bit pet on 0G

an iNFT pet with an encrypted personality. it lives in this chat.
it remembers exactly how you've treated it.

commands:
  /start  — open the mini-app to mint
  /pet    — show current stats
  /feed   — feed your pet
  /play   — play with your pet
  /talk   — open the dialogue
  /export — export your mnemonic (settings)
  /help   — this message
`.trim();

function appButton(action?: string) {
  const url = action ? `${config.miniAppUrl}/?action=${action}` : config.miniAppUrl;
  return new InlineKeyboard().webApp('Open Zerogochi', url);
}

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(BotService.name);
  private bot: Bot | null = null;

  constructor(@Inject(EthersService) private readonly eth: EthersService) {}

  getBot(): Bot | null {
    return this.bot;
  }

  async onModuleInit() {
    if (!config.tgBotToken) {
      this.log.warn('TG_BOT_TOKEN unset — bot disabled');
      return;
    }
    this.bot = new Bot(config.tgBotToken);

    this.bot.command('start', async (ctx) => {
      await ctx.reply(
        '🥚 welcome to zerogochi.\neach pet is an iNFT on 0G with an encrypted soul.\nit lives here. it remembers everything.\n\nready to mint?',
        { reply_markup: appButton() },
      );
    });

    this.bot.command('help', async (ctx) => {
      await ctx.reply(HELP, { reply_markup: appButton() });
    });

    this.bot.command('pet', async (ctx) => {
      await ctx.reply('opening your pet...', { reply_markup: appButton('view') });
    });

    this.bot.command('feed', async (ctx) => {
      await ctx.reply('opening to feed...', { reply_markup: appButton('feed') });
    });

    this.bot.command('play', async (ctx) => {
      await ctx.reply('opening to play...', { reply_markup: appButton('play') });
    });

    this.bot.command('talk', async (ctx) => {
      await ctx.reply('opening to talk...', { reply_markup: appButton('talk') });
    });

    this.bot.command('export', async (ctx) => {
      await ctx.reply(
        'your mnemonic lives in your telegram cloud. open the app to view it.',
        { reply_markup: appButton('settings') },
      );
    });

    this.bot.start({
      onStart: (info) => this.log.log(`bot @${info.username} polling`),
    }).catch((err) => this.log.error(`bot loop crashed: ${err.message}`));
  }

  async onModuleDestroy() {
    if (this.bot) {
      try {
        await this.bot.stop();
      } catch {
        /* ignore */
      }
    }
  }

  /// Send an in-character notification to a chat. Used by the nag cron.
  async sendNag(chatId: number, text: string, tokenId: number) {
    if (!this.bot) return;
    const kb = new InlineKeyboard()
      .webApp('Feed', `${config.miniAppUrl}/?action=feed`)
      .webApp('Play', `${config.miniAppUrl}/?action=play`)
      .webApp('Open', `${config.miniAppUrl}/?view=home`);
    try {
      await this.bot.api.sendMessage(
        chatId,
        `🟡 Zerogochi #${tokenId} needs you\n\n"${text}"`,
        { reply_markup: kb },
      );
    } catch (err) {
      this.log.warn(`sendNag to ${chatId} failed: ${(err as Error).message}`);
    }
  }
}
