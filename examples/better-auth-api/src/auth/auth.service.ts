import { Database } from 'bun:sqlite'
import { Injectable } from 'banhmi'
import { betterAuth } from 'better-auth'

@Injectable()
export class AuthService {
  static inject = [] as const

  readonly client = betterAuth({
    database: new Database('./better-auth.sqlite'),
    emailAndPassword: { enabled: true },
    trustedOrigins: [Bun.env.BETTER_AUTH_URL ?? 'http://localhost:3001'],
  })
}
