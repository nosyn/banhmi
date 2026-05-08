import { Module } from '@banhmi/common'
import { ConfigService } from './config.service'
import { CONFIG_TOKEN } from './tokens'
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class ConfigModule {
  static forRoot(schema, env) {
    @Module({
      providers: [
        {
          provide: CONFIG_TOKEN,
          useFactory: () => new ConfigService(schema, env ?? Bun.env),
        },
      ],
      exports: [CONFIG_TOKEN],
    })
    class ConfigRootModule {}
    return ConfigRootModule
  }
}
