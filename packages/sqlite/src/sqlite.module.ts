import { Database } from 'bun:sqlite'
import { Module } from '@banhmi/common'
import { DATABASE_TOKEN } from './tokens'

export interface SqliteModuleOptions {
  readonly?: boolean
  create?: boolean
  readwrite?: boolean
}

// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class SqliteModule {
  static forRoot(path: string, opts?: SqliteModuleOptions) {
    @Module({
      providers: [
        {
          provide: DATABASE_TOKEN,
          useFactory: () => {
            const db = new Database(path, opts)
            db.exec('PRAGMA journal_mode = WAL')
            return db
          },
        },
      ],
      exports: [DATABASE_TOKEN],
    })
    class SqliteRootModule {}

    return SqliteRootModule
  }
}
