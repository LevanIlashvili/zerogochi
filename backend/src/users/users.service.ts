import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface UserRecord {
  tgUserId: number;
  tgChatId: number;
  address: string;
  tokenId?: number;
  lastNotifAt?: number;
}

// Persistence path. In Docker we mount a volume at /app/data and set
// USERS_FILE=/app/data/users.json so registrations survive container redeploys.
const STORE_FILE = process.env.USERS_FILE
  ? process.env.USERS_FILE
  : join(process.cwd(), 'users.json');

/**
 * Tiny user registry: TG user/chat id ↔ wallet address ↔ tokenId.
 * Persisted as a single JSON file. Hackathon-scale, no DB.
 */
@Injectable()
export class UsersService implements OnModuleInit {
  private readonly log = new Logger(UsersService.name);
  private byTgId = new Map<number, UserRecord>();

  onModuleInit() {
    if (existsSync(STORE_FILE)) {
      try {
        const raw = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as UserRecord[];
        for (const u of raw) this.byTgId.set(u.tgUserId, u);
        this.log.log(`loaded ${this.byTgId.size} user records`);
      } catch (err) {
        this.log.warn(`users.json unreadable: ${(err as Error).message}`);
      }
    }
  }

  private flush() {
    try {
      writeFileSync(STORE_FILE, JSON.stringify([...this.byTgId.values()], null, 2));
    } catch (err) {
      this.log.warn(`users.json write failed: ${(err as Error).message}`);
    }
  }

  upsert(record: UserRecord) {
    const existing = this.byTgId.get(record.tgUserId);
    this.byTgId.set(record.tgUserId, { ...existing, ...record });
    this.flush();
  }

  setLastNotif(tgUserId: number, ts: number) {
    const u = this.byTgId.get(tgUserId);
    if (!u) return;
    u.lastNotifAt = ts;
    this.flush();
  }

  setTokenId(tgUserId: number, tokenId: number) {
    const u = this.byTgId.get(tgUserId);
    if (!u) return;
    u.tokenId = tokenId;
    this.flush();
  }

  all(): UserRecord[] {
    return [...this.byTgId.values()];
  }

  byTg(tgUserId: number): UserRecord | undefined {
    return this.byTgId.get(tgUserId);
  }
}
