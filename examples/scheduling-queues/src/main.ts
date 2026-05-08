import { BanhmiFactory } from 'banhmi'
import { AppModule } from './app.module'

const app = await BanhmiFactory.create(AppModule)
app.enableShutdownHooks()
await app.listen(3000)

console.log('Scheduling-queues app running on http://localhost:3000')
console.log('Devtools: http://localhost:3000/__banhmi/devtools')
