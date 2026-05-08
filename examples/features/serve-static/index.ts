// Demo: serve files from ./public at /static/* using @banhmi/static.
// No controllers needed — the static module is the only import.
import { join } from 'node:path'
import { StaticModule } from '@banhmi/static'
import { Module } from 'banhmi'

@Module({
  imports: [
    StaticModule.forRoot({
      root: join(import.meta.dir, 'public'),
      prefix: '/static',
    }),
  ],
})
export class AppModule {}
