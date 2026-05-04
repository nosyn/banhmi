import { BunnestFactory } from 'banhmi'
import { AppModule } from './app.module'

const app = await BunnestFactory.create(AppModule)
app.enableShutdownHooks()
await app.listen(3000)

console.log('Bunnest running on http://localhost:3000')
