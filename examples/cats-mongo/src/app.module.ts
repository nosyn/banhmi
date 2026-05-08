import { MongoModule } from '@banhmi/mongo'
import { Module } from 'banhmi'
import { CatsModule } from './cats/cats.module'

/**
 * Root application module.
 *
 * Initialises `MongoModule.forRoot` with the connection URL from `MONGO_URL`
 * (falls back to `mongodb://localhost:27017`) and registers `CatsModule`.
 */
@Module({
  imports: [
    MongoModule.forRoot({
      url: Bun.env.MONGO_URL ?? 'mongodb://localhost:27017',
      database: 'cats',
    }),
    CatsModule,
  ],
})
export class AppModule {}
