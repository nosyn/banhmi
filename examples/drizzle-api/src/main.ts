import { BanhmiFactory } from 'banhmi'
import { AppModule } from './app.module'

const app = await BanhmiFactory.create(AppModule)
app.enableShutdownHooks()
await app.listen(3002)

console.log('Drizzle API running on http://localhost:3002')
console.log('')
console.log('Users:  GET/POST http://localhost:3002/users')
console.log('User:   GET      http://localhost:3002/users/:id')
console.log('Posts:  GET      http://localhost:3002/users/:id/posts')
console.log('Posts:  GET/POST http://localhost:3002/posts')
