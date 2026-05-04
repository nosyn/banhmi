import { Module } from '@banhmi/common'
import { JwtGuard } from './jwt.guard'
import { JwtService } from './jwt.service'
import {
  JWT_OPTIONS_TOKEN,
  JWT_SERVICE_TOKEN,
  type JwtModuleOptions,
} from './tokens'

// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class JwtModule {
  static forRoot(options: JwtModuleOptions) {
    @Module({
      providers: [
        { provide: JWT_OPTIONS_TOKEN, useValue: options },
        {
          provide: JWT_SERVICE_TOKEN,
          useFactory: () => new JwtService(options),
        },
        JwtGuard,
      ],
      exports: [JWT_SERVICE_TOKEN, JwtGuard],
    })
    class JwtRootModule {}

    return JwtRootModule
  }
}
