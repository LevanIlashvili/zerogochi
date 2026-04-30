import { Inject, Injectable } from '@nestjs/common';
import { Log } from 'ethers';
import { EthersService } from '../ethers/ethers.service';

/// Reconstructs a pet's interaction history from on-chain events.
/// Hackathon-scale: scans the last 100k blocks. Real prod would use an
/// indexer; here we trust the RPC and accept the latency.

interface HistoryEvent {
  kind: 'born' | 'fed' | 'played' | 'spoke' | 'died';
  at: number; // unix seconds
  blockNumber: number;
}

@Injectable()
export class HistoryService {
  constructor(@Inject(EthersService) private readonly eth: EthersService) {}

  async eventsFor(tokenId: bigint, lookbackBlocks = 100_000): Promise<HistoryEvent[]> {
    if (!this.eth.zerogochi) return [];
    const provider = this.eth.provider;
    const head = await provider.getBlockNumber();
    const fromBlock = Math.max(0, head - lookbackBlocks);
    const c = this.eth.zerogochi;

    const filters = [
      { kind: 'born' as const, filter: c.filters.Born(tokenId) },
      { kind: 'fed' as const, filter: c.filters.Fed(tokenId) },
      { kind: 'played' as const, filter: c.filters.Played(tokenId) },
      { kind: 'spoke' as const, filter: c.filters.Spoke(tokenId) },
      { kind: 'died' as const, filter: c.filters.Died(tokenId) },
    ];

    const all: HistoryEvent[] = [];
    for (const { kind, filter } of filters) {
      const logs: Log[] = await c.queryFilter(filter, fromBlock, head);
      for (const lg of logs) {
        // The first arg after indexed tokenId is `at` for all of these events
        const parsed = c.interface.parseLog({ topics: lg.topics as string[], data: lg.data });
        const at = Number(parsed?.args?.at ?? 0);
        all.push({ kind, at, blockNumber: lg.blockNumber });
      }
    }

    return all.sort((a, b) => a.blockNumber - b.blockNumber);
  }

  /// Compress history into a few sentences the LLM can use without
  /// blowing the prompt budget.
  summarize(events: HistoryEvent[]): string {
    if (events.length === 0) return 'You were just born. No history yet.';
    const counts = { born: 0, fed: 0, played: 0, spoke: 0, died: 0 };
    let firstAt = events[0].at;
    let lastAt = events[events.length - 1].at;
    for (const e of events) counts[e.kind]++;

    const ageDays = Math.max(1, Math.round((Date.now() / 1000 - firstAt) / 86_400));
    const lastFed = [...events].reverse().find((e) => e.kind === 'fed')?.at;
    const lastPlayed = [...events].reverse().find((e) => e.kind === 'played')?.at;
    const fedHoursAgo = lastFed ? Math.round((Date.now() / 1000 - lastFed) / 3600) : null;
    const playedHoursAgo = lastPlayed
      ? Math.round((Date.now() / 1000 - lastPlayed) / 3600)
      : null;

    const parts: string[] = [];
    parts.push(`You are ${ageDays} day${ageDays === 1 ? '' : 's'} old.`);
    parts.push(`You have been fed ${counts.fed} time${counts.fed === 1 ? '' : 's'} and played with ${counts.played} time${counts.played === 1 ? '' : 's'}.`);
    if (fedHoursAgo != null) parts.push(`Last fed ${fedHoursAgo}h ago.`);
    if (playedHoursAgo != null) parts.push(`Last played ${playedHoursAgo}h ago.`);
    if (counts.spoke > 0) parts.push(`You and your owner have spoken ${counts.spoke} time${counts.spoke === 1 ? '' : 's'} before.`);
    return parts.join(' ');
  }

  /// Builds a richer event-by-event chronicle for "interrogate me" style
  /// reflection. Surfaces gaps (long stretches with no feeding/playing),
  /// streaks, neglect events. The LLM uses this to reference specific
  /// moments in its judgment of the owner.
  judgmentSummary(events: HistoryEvent[]): string {
    if (events.length === 0) {
      return 'You were just born. The owner has not done anything yet.';
    }
    const now = Math.floor(Date.now() / 1000);
    const bornEvent = events.find((e) => e.kind === 'born');
    // Some Born events come back with at=0 from parseLog edge cases; fall
    // back to the earliest event's `at`, then to "now" so we never NaN.
    const candidate = bornEvent?.at || events[0]?.at || 0;
    const bornAt = candidate > 0 ? candidate : now;
    const ageHours = Math.max(0, Math.round((now - bornAt) / 3600));

    // Sequence of meaningful actions (skip 'born' itself), ordered
    const actions = events
      .filter((e) => e.kind !== 'born')
      .sort((a, b) => a.at - b.at);

    const lines: string[] = [];
    lines.push(`You were born ${formatAgo(now - bornAt)} ago.`);

    if (actions.length === 0) {
      lines.push('The owner has not interacted with you a single time since.');
    } else {
      // Gaps between successive interactions
      let prev = bornAt;
      const events_described: string[] = [];
      for (const a of actions) {
        const gap = a.at - prev;
        const gapStr = formatAgo(gap);
        const verb = a.kind === 'fed' ? 'fed you' : a.kind === 'played' ? 'played with you' : a.kind === 'spoke' ? 'talked to you' : 'let you die';
        events_described.push(`After ${gapStr} of nothing, the owner ${verb}.`);
        prev = a.at;
      }
      // Show at most the 8 most recent + the first 2 (so the LLM has
      // both early-history context and recent-history context)
      if (events_described.length <= 10) {
        lines.push(...events_described);
      } else {
        lines.push(...events_described.slice(0, 2));
        lines.push(`...then ${events_described.length - 10} more interactions...`);
        lines.push(...events_described.slice(-8));
      }
      // How long since the last action
      const sinceLast = now - prev;
      lines.push(`Since the last action it has been ${formatAgo(sinceLast)}.`);
    }

    // Counts
    const fed = actions.filter((a) => a.kind === 'fed').length;
    const played = actions.filter((a) => a.kind === 'played').length;
    const spoke = actions.filter((a) => a.kind === 'spoke').length;
    lines.push(
      `In total: fed ${fed} times, played ${played} times, spoke ${spoke} times. Age: ${ageHours} hours.`,
    );

    return lines.join('\n');
  }
}

function formatAgo(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return 'a while';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86_400)}d`;
}
