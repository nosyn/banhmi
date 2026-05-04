import { Module } from '@banhmi/common'
import { RedisService } from './redis.service'
import { REDIS_TOKEN } from './tokens'

// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class RedisModule {
  static forRoot(url: string) {
    @Module({
      providers: [
        {
          provide: REDIS_TOKEN,
          useFactory: () => {
            const IORedis = require('ioredis')
            return new IORedis(url)
          },
        },
        RedisService,
      ],
      exports: [REDIS_TOKEN, RedisService],
    })
    class RedisRootModule {}

    return RedisRootModule
  }
}
