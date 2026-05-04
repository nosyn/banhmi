import { Database } from 'bun:sqlite'
import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  database: new Database('./better-auth.sqlite'),
  emailAndPassword: { enabled: true },
  trustedOrigins: [Bun.env.BETTER_AUTH_URL ?? 'http://localhost:3001'],
})
