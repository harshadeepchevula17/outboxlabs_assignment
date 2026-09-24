import { redisConnection } from '../config/redis';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  maxLimit: number;
  hourWindow: string;
  nextWindowStart: Date;
}

export class RateLimiterService {
  /**
   * Generates the Redis key for hourly rate limiting per sender.
   * Format: email-rate:{senderId}:{YYYY-MM-DD-HH}
   */
  static getHourWindowKey(senderId: string, date: Date = new Date()): { key: string; hourWindow: string } {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const hourWindow = `${year}-${month}-${day}-${hour}`;
    const key = `email-rate:${senderId}:${hourWindow}`;
    return { key, hourWindow };
  }

  /**
   * Calculates start of the next hour window UTC.
   */
  static getNextHourStart(date: Date = new Date()): Date {
    const nextHour = new Date(date);
    nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
    return nextHour;
  }

  /**
   * Atomically checks and increments hourly email counter for sender.
   */
  static async checkAndIncrementHourlyLimit(
    senderId: string,
    customMaxLimit?: number
  ): Promise<RateLimitCheckResult> {
    const maxLimit = (customMaxLimit && customMaxLimit > 0) ? customMaxLimit : config.MAX_EMAILS_PER_HOUR_PER_SENDER;
    const now = new Date();
    const { key, hourWindow } = this.getHourWindowKey(senderId, now);
    const nextWindowStart = this.getNextHourStart(now);

    const luaScript = `
      local key = KEYS[1]
      local maxLimit = tonumber(ARGV[1])
      local current = tonumber(redis.call('get', key) or "0")

      if current >= maxLimit then
        return -1
      else
        local count = redis.call('incr', key)
        if count == 1 then
          redis.call('expire', key, 7200)
        end
        return count
      end
    `;

    try {
      const result = (await redisConnection.eval(
        luaScript,
        1,
        key,
        maxLimit.toString()
      )) as number;

      if (result === -1) {
        const currentCount = parseInt((await redisConnection.get(key)) || maxLimit.toString(), 10);
        return {
          allowed: false,
          currentCount,
          maxLimit,
          hourWindow,
          nextWindowStart,
        };
      }

      return {
        allowed: true,
        currentCount: result,
        maxLimit,
        hourWindow,
        nextWindowStart,
      };
    } catch (err) {
      logger.error({ err, senderId }, 'Error evaluating rate limit Lua script');
      // Fallback: allow send if Redis error occurs to avoid silent blackhole
      return {
        allowed: true,
        currentCount: 0,
        maxLimit,
        hourWindow,
        nextWindowStart,
      };
    }
  }

  /**
   * Distributed Throttling: Enforces MIN_DELAY_BETWEEN_EMAILS_MS per sender.
   * Atomically reserves a timestamp slot and returns delay needed in ms.
   */
  static async reserveThrottleSlot(senderId: string, customDelayMs?: number): Promise<number> {
    const minDelayMs = (customDelayMs !== undefined && customDelayMs > 0)
      ? customDelayMs
      : config.MIN_DELAY_BETWEEN_EMAILS_MS;
    if (minDelayMs <= 0) return 0;

    const key = `email-throttle:${senderId}`;
    const now = Date.now();

    const luaScript = `
      local key = KEYS[1]
      local minDelay = tonumber(ARGV[1])
      local now = tonumber(ARGV[2])

      local lastTime = tonumber(redis.call('get', key) or "0")
      local nextAllowedTime = math.max(now, lastTime + minDelay)
      redis.call('set', key, tostring(nextAllowedTime), 'PX', minDelay * 10)

      return nextAllowedTime
    `;

    try {
      const nextAllowedTime = (await redisConnection.eval(
        luaScript,
        1,
        key,
        minDelayMs.toString(),
        now.toString()
      )) as number;

      const waitMs = Math.max(0, nextAllowedTime - now);
      return waitMs;
    } catch (err) {
      logger.error({ err, senderId }, 'Error executing throttle Lua script');
      return 0;
    }
  }

  /**
   * Helper to retrieve current sender rate limit status for dashboard.
   */
  static async getSenderRateLimitStatus(senderId: string) {
    const maxLimit = config.MAX_EMAILS_PER_HOUR_PER_SENDER;
    const now = new Date();
    const { key } = this.getHourWindowKey(senderId, now);
    const countStr = await redisConnection.get(key);
    const sentThisHour = countStr ? parseInt(countStr, 10) : 0;
    const nextHourStart = this.getNextHourStart(now);
    const resetInSeconds = Math.max(0, Math.ceil((nextHourStart.getTime() - now.getTime()) / 1000));

    return {
      senderId,
      sentThisHour,
      maxLimitPerHour: maxLimit,
      remainingThisHour: Math.max(0, maxLimit - sentThisHour),
      resetInSeconds,
      minDelayMs: config.MIN_DELAY_BETWEEN_EMAILS_MS,
    };
  }
}
