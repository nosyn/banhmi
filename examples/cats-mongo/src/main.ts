import { BanhmiFactory } from 'banhmi'
import { AppModule } from './app.module'

/**
 * Cats Mongo API entry point.
 *
 * Set MONGO_URL to connect to a running MongoDB instance.
 * Without MONGO_URL the app connects to mongodb://localhost:27017.
 */
const app = await BanhmiFactory.create(AppModule)
app.enableShutdownHooks()
await app.listen(3003)

console.log('Cats Mongo API running on http://localhost:3003')
console.log('')
console.log('Cats: GET/POST http://localhost:3003/cats')
console.log('Cat:  GET      http://localhost:3003/cats/:id')
console.log('Cat:  DELETE   http://localhost:3003/cats/:id')
