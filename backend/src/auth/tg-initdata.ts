import { createHmac } from 'node:crypto';

export interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface VerifiedInitData {
  user: TgUser;
  authDate: number;
  raw: string;
}

/**
 * Verify a Telegram Mini App initData string.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Returns the parsed data if valid, throws if not. Maximum age in seconds
 * defaults to 1 day — replay-safe enough for our hackathon.
 */
export function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 86_400,
): VerifiedInitData {
  if (!initData) throw new Error('missing initData');
  if (!botToken) throw new Error('missing bot token');

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('initData missing hash');
  params.delete('hash');

  // Build data-check-string: keys sorted alphabetically, joined by \n as `key=value`.
  const checkString = [...params.entries()]
    .map(([k, v]) => [k, v] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(checkString).digest('hex');
  if (expected !== hash) throw new Error('initData hash mismatch');

  const authDateRaw = params.get('auth_date');
  if (!authDateRaw) throw new Error('initData missing auth_date');
  const authDate = Number(authDateRaw);
  if (!Number.isFinite(authDate)) throw new Error('initData auth_date NaN');

  const ageSec = Math.floor(Date.now() / 1000) - authDate;
  if (ageSec > maxAgeSec) throw new Error(`initData too old (${ageSec}s)`);

  const userRaw = params.get('user');
  if (!userRaw) throw new Error('initData missing user');
  let user: TgUser;
  try {
    user = JSON.parse(userRaw);
  } catch {
    throw new Error('initData user not valid JSON');
  }
  if (typeof user.id !== 'number') throw new Error('initData user.id missing');

  return { user, authDate, raw: initData };
}
