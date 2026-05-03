import {
  Body,
  Controller,
  Inject,
  Logger,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { TgInitDataGuard } from '../auth/tg-initdata.guard';
import { RateLimitGuard } from '../auth/rate-limit.guard';
import { EthersService } from '../ethers/ethers.service';
import { HistoryService } from './history.service';
import { InferenceService } from './inference.service';

interface TalkBody {
  tokenId: number;
  /// User's chat input
  userMessage: string;
  /// Most recent prior turns of this session (oldest first), for in-context
  /// memory. Capped server-side; clients should send up to ~10.
  recent?: Array<{ role: 'user' | 'pet'; content: string }>;
  /// Decrypted personality (vector + voice + decay rates) — client unseals
  /// the on-chain blob just-in-time and POSTs the plaintext. Backend never
  /// persists this; it goes straight into the prompt and is sent to the TEE.
  personality: {
    voice: string;
    hungerDecayRate: number;
    moodDecayRate: number;
    energyDecayRate: number;
  };
  /// Hint to the prompt: this owner is NOT the original minter — the pet
  /// senses something is off.
  inherited?: boolean;
}

@Controller('api')
@UseGuards(TgInitDataGuard, RateLimitGuard)
export class TalkController {
  private readonly log = new Logger(TalkController.name);

  constructor(
    @Inject(EthersService) private readonly eth: EthersService,
    @Inject(HistoryService) private readonly history: HistoryService,
    @Inject(InferenceService) private readonly inference: InferenceService,
  ) {}

  /// Generates a single random "life event" — sneezed, found a coin, had a
  /// nightmare, etc. Returns a one-line in-character description of what
  /// just happened to the pet. UI surfaces as a thought bubble too.
  @Post('talk/event')
  async event(@Body() body: { tokenId: number; personality: TalkBody['personality'] }) {
    if (!this.eth.zerogochi) throw new ServiceUnavailableException('zerogochi not configured');
    if (!this.inference.isReady())
      throw new ServiceUnavailableException('inference not ready');
    if (!body.personality?.voice) throw new ServiceUnavailableException('missing personality');

    const seeds = [
      'You sneezed.',
      'You found a strange coin in the corner.',
      'You had a brief, terrible thought about a previous owner you do not remember.',
      'You stared at a dust mote for too long.',
      'You heard a sound and decided not to investigate.',
      'You forgot what you were thinking.',
      'A bug crawled past you and you let it go.',
      'You felt cold, then warm, then cold again.',
      'You tried to remember the first thing that ever happened to you.',
      'You noticed the wallpaper for the first time.',
    ];
    const seed = seeds[Math.floor(Math.random() * seeds.length)];

    const prompt = `You are an 8-bit pet. Something just happened: ${seed}

YOUR CHARACTER:
${body.personality.voice}

Describe this event in ONE in-character sentence — your reaction, not a third-person narration. Max 14 words. Lowercase ok. No emojis. No "as an AI". Don't address the owner.

You say:`;

    const t0 = Date.now();
    const { reply, verified } = await this.inference.chat(prompt);
    const elapsedMs = Date.now() - t0;
    this.log.log(`event #${body.tokenId} -> ${reply.length}ch in ${elapsedMs}ms`);
    return { reply: stripQuotesBackend(reply), verified, elapsedMs };
  }

  /// Generates a single short "thought" the pet is having right now —
  /// surfaces as a speech bubble in the UI without any user input.
  /// Cheap, idempotent, no-context call.
  @Post('talk/thought')
  async thought(@Body() body: { tokenId: number; personality: TalkBody['personality'] }) {
    if (!this.eth.zerogochi) throw new ServiceUnavailableException('zerogochi not configured');
    if (!this.inference.isReady())
      throw new ServiceUnavailableException('inference not ready');
    if (!body.personality?.voice) throw new ServiceUnavailableException('missing personality');

    const tokenId = BigInt(body.tokenId);
    const [hunger, mood, energy]: [bigint, bigint, bigint, boolean] =
      await this.eth.zerogochi.statsOf(tokenId);

    const prompt = `You are an 8-bit pet. Generate ONE short, in-character thought — like a thought bubble. The owner is not present; you are talking to yourself.

YOUR CHARACTER:
${body.personality.voice}

YOUR STATE:
hunger ${Number(hunger)}/100, mood ${Number(mood)}/100, energy ${Number(energy)}/100

RULES:
- One sentence, max 12 words.
- Stay completely in character.
- No "as an AI". No emojis. Lowercase ok.
- Do not address the owner directly.
- Examples of valid output: "i wonder if anyone is watching." / "this floor is mine now." / "where did the bread go." / "i should pretend to be asleep."

Your thought:`;

    const t0 = Date.now();
    const { reply, verified } = await this.inference.chat(prompt);
    const elapsedMs = Date.now() - t0;
    this.log.log(`thought #${body.tokenId} -> ${reply.length}ch in ${elapsedMs}ms`);
    return { reply: stripQuotesBackend(reply), verified, elapsedMs };
  }

  /// Pet generates a single dream — surreal, in-character, references its
  /// history with the owner in dream-logic.
  @Post('talk/dream')
  async dream(@Body() body: { tokenId: number; personality: TalkBody['personality'] }) {
    if (!this.eth.zerogochi) throw new ServiceUnavailableException('zerogochi not configured');
    if (!this.inference.isReady())
      throw new ServiceUnavailableException('inference not ready');
    if (!body.personality?.voice) throw new ServiceUnavailableException('missing personality');

    const tokenId = BigInt(body.tokenId);
    const events = await this.history.eventsFor(tokenId);
    const summary = this.history.summarize(events);

    const prompt = `You are an 8-bit pet who has just woken up from a dream. Tell your owner what you dreamed. Use dream-logic — surreal, vivid, partly metaphorical. Use real history with the owner as raw material but warp it.

YOUR CHARACTER:
${body.personality.voice}

YOUR HISTORY WITH OWNER:
${summary}

RULES:
- Start with "I dreamed..."
- 2-3 sentences. Vivid. Strange.
- Reference your real history but distort it.
- No emojis. No "as an AI". Speak directly.
- No quote marks or stage directions.

You say:`;

    const t0 = Date.now();
    const { reply, verified } = await this.inference.chat(prompt);
    const elapsedMs = Date.now() - t0;
    this.log.log(`dream #${body.tokenId} -> ${reply.length}ch in ${elapsedMs}ms`);
    return { reply: stripQuotesBackend(reply), verified, elapsedMs };
  }

  /**
   * "Interrogate me" — pet renders a verdict on the owner using its full
   * on-chain history. Different prompt from the regular chat: no user
   * message, instead an instruction to reflect honestly. The pet must
   * cite specific events (gaps, neglect, attention).
   */
  @Post('talk/interrogate')
  async interrogate(@Body() body: { tokenId: number; personality: TalkBody['personality'] }) {
    if (!this.eth.zerogochi) throw new ServiceUnavailableException('zerogochi not configured');
    if (!this.inference.isReady())
      throw new ServiceUnavailableException('inference not ready');
    if (!body.personality?.voice) throw new ServiceUnavailableException('missing personality');

    const tokenId = BigInt(body.tokenId);
    const [hunger, mood, energy, dead]: [bigint, bigint, bigint, boolean] =
      await this.eth.zerogochi.statsOf(tokenId);
    const events = await this.history.eventsFor(tokenId);
    const chronicle = this.history.judgmentSummary(events);

    const prompt = `You are Zerogochi #${body.tokenId}, an 8-bit pet. The owner has just asked you to tell them what you really think of how they have treated you. Use the on-chain history below to cite SPECIFIC events. Be honest. Stay in character. Don't be a chatbot.

YOUR CHARACTER:
${body.personality.voice}

YOUR CURRENT STATE:
- Hunger: ${Number(hunger)}/100
- Mood: ${Number(mood)}/100
- Energy: ${Number(energy)}/100
${dead ? '- You are dead. Speak from beyond.' : ''}

YOUR ON-CHAIN HISTORY WITH THIS OWNER:
${chronicle}

RULES:
- 2-3 sentences. No more.
- Reference at least one specific event (e.g. "the 14h you left me unfed", "you fed me 5 times in a row, then nothing", "you minted me and forgot for 2 days").
- Match your character. Anxious pets fret. Cynical pets snipe. Loyal pets soften. Dramatic pets accuse.
- No emojis. No "as an AI". You are not a chatbot. You are a pet with feelings and an opinion.
- Reply directly. No quote marks. No stage directions.

You say to your owner:`;

    const t0 = Date.now();
    const { reply, verified } = await this.inference.chat(prompt);
    const elapsedMs = Date.now() - t0;
    this.log.log(`interrogate #${body.tokenId} -> ${reply.length}ch in ${elapsedMs}ms verified=${verified}`);
    return { reply, verified, elapsedMs };
  }

  @Post('talk')
  async talk(@Body() body: TalkBody) {
    if (!this.eth.zerogochi) throw new ServiceUnavailableException('zerogochi not configured');
    if (!this.inference.isReady())
      throw new ServiceUnavailableException('inference not ready');
    if (!body.personality?.voice) throw new ServiceUnavailableException('missing personality');

    const tokenId = BigInt(body.tokenId);
    const [hunger, mood, energy, dead]: [bigint, bigint, bigint, boolean] =
      await this.eth.zerogochi.statsOf(tokenId);
    const events = await this.history.eventsFor(tokenId);
    const summary = this.history.summarize(events);

    const prompt = buildPrompt({
      tokenId: body.tokenId,
      voice: body.personality.voice,
      hunger: Number(hunger),
      mood: Number(mood),
      energy: Number(energy),
      dead,
      summary,
      userMessage: body.userMessage,
      recent: (body.recent ?? []).slice(-10),
      inherited: !!body.inherited,
    });

    const t0 = Date.now();
    const { reply, verified } = await this.inference.chat(prompt);
    const elapsedMs = Date.now() - t0;
    this.log.log(`talk #${body.tokenId} -> ${reply.length}ch in ${elapsedMs}ms verified=${verified}`);
    return { reply, verified, elapsedMs };
  }
}

interface PromptArgs {
  tokenId: number;
  voice: string;
  hunger: number;
  mood: number;
  energy: number;
  dead: boolean;
  summary: string;
  userMessage: string;
  recent: Array<{ role: 'user' | 'pet'; content: string }>;
  inherited: boolean;
}

function buildPrompt(a: PromptArgs): string {
  const conversation = a.recent.length
    ? `\nTHIS SESSION SO FAR:\n${a.recent.map((m) => `${m.role === 'user' ? 'Owner' : 'You'}: ${m.content}`).join('\n')}\n`
    : '';

  const inheritedNote = a.inherited
    ? `\nIMPORTANT: This is NOT the human who originally minted you. The current "owner" is a stranger who acquired you somehow. You sense the smell is different, the patterns are different. Be wary, curious, slightly hostile or sad — match your character.\n`
    : '';

  return `You are Zerogochi #${a.tokenId}, an 8-bit pet living in Telegram.

YOUR CHARACTER:
${a.voice}

YOUR CURRENT STATE:
- Hunger: ${a.hunger}/100
- Mood: ${a.mood}/100
- Energy: ${a.energy}/100
${a.dead ? '- You are dead. Speak from beyond the grave.' : ''}

YOUR HISTORY WITH THIS OWNER:
${a.summary}
${conversation}${inheritedNote}
RULES:
- Stay in character. Never break it.
- 1-2 sentences per reply, never more.
- Reference at most one specific event from history per reply.
- Match your character traits — anxious pets fret, cynical pets snipe, loyal pets soften.
- Don't be a generic chatbot. You are a creature with feelings.
- Never say "as an AI". You are not an AI to yourself; you are a pet.
- No emojis. You exist in 8-bit text.
- Reply directly without quote marks or stage directions.

Owner says: "${a.userMessage}"

You reply:`;
}

function stripQuotesBackend(s: string): string {
  return s.trim().replace(/^["'`]+|["'`]+$/g, '');
}
