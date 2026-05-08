import { Module } from '@banhmi/common'
import { MemoryCacheStore } from './store'
import { CACHE_STORE_TOKEN } from './tokens'
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class CacheModule {
  static forRoot(options) {
    @Module({
      providers: [
        {
          provide: CACHE_STORE_TOKEN,
          useFactory: () => {
            if (options.store === 'memory') {
              return new MemoryCacheStore()
            }
            // Redis store: lazy import to avoid hard dep on @banhmi/redis
            // This is resolved at runtime if @banhmi/redis is installed
            throw new Error(
              'Redis store requires @banhmi/redis — use CacheModule with a RedisStore instance',
            )
          },
        },
      ],
      exports: [CACHE_STORE_TOKEN],
    })
    class CacheRootModule {}
    return CacheRootModule
  }
}
