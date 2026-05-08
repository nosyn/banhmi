import { BanhmiFactory } from 'banhmi'
import { AppModule } from './app.module'
import { PostgresRawAppModule } from './postgres-raw.module'

/**
 * Boot mode switch.
 *
 * --mode=postgres-raw   — uses @banhmi/postgres (raw Bun.SQL) with a
 *                          simple Cat entity instead of Drizzle.
 *                          Requires DATABASE_URL to be set.
 *
 * (default)             — uses @banhmi/drizzle with an in-memory SQLite
 *                          database and the full users/posts schema.
 */
const mode = Bun.argv.find((a) => a.startsWith('--mode='))?.split('=')[1]

if (mode === 'postgres-raw') {
  if (!Bun.env.DATABASE_URL) {
    console.error('postgres-raw mode requires DATABASE_URL to be set')
    process.exit(1)
  }
  const app = await BanhmiFactory.create(PostgresRawAppModule)
  app.enableShutdownHooks()
  await app.listen(3002)
  console.log(
    'Drizzle API (postgres-raw mode) running on http://localhost:3002',
  )
  console.log('')
  console.log('Cats: GET/POST http://localhost:3002/cats')
  console.log('Cat:  GET      http://localhost:3002/cats/:id')
} else {
  const app = await BanhmiFactory.create(AppModule)
  app.enableShutdownHooks()
  await app.listen(3002)
  console.log('Drizzle API running on http://localhost:3002')
  console.log('')
  console.log('Users:  GET/POST http://localhost:3002/users')
  console.log('User:   GET      http://localhost:3002/users/:id')
  console.log('Posts:  GET      http://localhost:3002/users/:id/posts')
  console.log('Posts:  GET/POST http://localhost:3002/posts')
}
