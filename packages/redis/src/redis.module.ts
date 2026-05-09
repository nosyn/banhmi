import { Module } from '@banhmi/common'
import { RedisService } from './redis.service'
import { REDIS_TOKEN } from './tokens'
import type { RedisLike } from './types'

/**
 * Wraps `Bun.RedisClient` in a `RedisLike` adapter suitable for DI.
 *
 * `Bun.RedisClient.subscribe` is callback-based, which matches `RedisLike`.
 * A dedicated subscriber connection is NOT created here; if you need pub/sub,
 * inject `REDIS_TOKEN` directly and manage your own subscriber via `.duplicate()`.
 *
 * @internal
 */
function makeBunRedisAdapter(url: string): RedisLike {
  const client = new Bun.RedisClient(url)

  return {
    get: (key) => client.get(key),
    set: (key, value, ttlSeconds) =>
      ttlSeconds !== undefined
        ? client.set(key, value, 'EX', ttlSeconds)
        : client.set(key, value),
    del: (key) => client.del(key),
    expire: (key, seconds) => client.expire(key, seconds),
    pexpire: (key, ms, nx) =>
      nx === 'NX'
        ? (client.send('PEXPIRE', [key, String(ms), 'NX']) as Promise<number>)
        : client.pexpire(key, ms),
    pttl: (key) => client.pttl(key),
    incr: (key) => client.incr(key),
    publish: (channel, message) => client.publish(channel, message),
    subscribe: (channel, listener) => {
      void client.subscribe(channel, (msg: string) => listener(msg))
    },
    hset: (key, fields) => client.hset(key, fields),
    hgetall: (key) => client.hgetall(key),
    lpush: (key, value) => client.lpush(key, value),
    rpop: (key) => client.rpop(key),
    zadd: (key, score, member) => client.zadd(key, String(score), member),
    zrangebyscore: (key, min, max) => client.zrangebyscore(key, min, max),
    zrem: (key, member) => client.zrem(key, member),
    close: () => client.close(),
  }
}

// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class RedisModule {
  static forRoot(url: string) {
    @Module({
      providers: [
        {
          provide: REDIS_TOKEN,
          useFactory: (): RedisLike => makeBunRedisAdapter(url),
        },
        RedisService,
      ],
      exports: [REDIS_TOKEN, RedisService],
    })
    class RedisRootModule {}

    return RedisRootModule
  }
}
