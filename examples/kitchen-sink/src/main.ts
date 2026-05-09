import { BanhmiFactory } from 'banhmi'
import { AppModule } from './app.module'
import { config } from './config'
import { setupOpenApi } from './openapi/openapi.setup'

const app = await BanhmiFactory.create(AppModule)
app.enableShutdownHooks()
setupOpenApi(app)
const port = config.port || 3000
await app.listen(port)

const base = app.getUrl()
console.log(`Kitchen Sink running on ${base}`)
console.log(`  API docs:  ${base}/api/docs`)
console.log(`  Health:    ${base}/api/health`)
console.log(`  Devtools:  ${base}/__banhmi/devtools`)
console.log(`  Events:    ${base}/events  (SSE)`)
console.log(`  WS tasks:  ws://${new URL(base).host}/ws/tasks`)
