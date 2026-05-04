import { BanhmiFactory } from 'banhmi'
import { AuthService } from './auth/auth.service'
import { AppModule } from './app.module'

const app = await BanhmiFactory.create(AppModule)
const auth = app.container.resolve(AuthService)

app.use(async (req: Request, next: () => Promise<Response>) => {
  const url = new URL(req.url)
  if (url.pathname.startsWith('/api/auth')) {
    return auth.client.handler(req)
  }
  return next()
})

app.enableShutdownHooks()
await app.listen(3001)

console.log('Server running on http://localhost:3001')
console.log('')
console.log('Sign up:  POST http://localhost:3001/api/auth/sign-up/email')
console.log('Sign in:  POST http://localhost:3001/api/auth/sign-in/email')
console.log(
  'Profile:  GET  http://localhost:3001/users/me  (requires auth cookie)',
)
console.log('Public:   GET  http://localhost:3001/users/ping')
