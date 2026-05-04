import { Database } from 'bun:sqlite'
import { Module, Token } from 'banhmi'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

export const DB_TOKEN = Token<DrizzleDB>('DrizzleDB')

@Module({
  providers: [
    {
      provide: DB_TOKEN,
      useFactory: (): DrizzleDB => {
        const sqlite = new Database('./drizzle-api.sqlite')
        return drizzle({ client: sqlite, schema })
      },
    },
  ],
  exports: [DB_TOKEN],
})
export class DatabaseModule {}
