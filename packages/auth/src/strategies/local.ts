import type { RouteCtx } from '@banhmi/common'
import { Strategy } from '../strategy'

/**
 * Options for {@link LocalStrategy}.
 *
 * @typeParam TUser - The shape of the authenticated principal.
 */
export type LocalStrategyOptions<TUser> = {
  /**
   * Name of the JSON/form field for the username.
   * @default 'username'
   */
  usernameField?: string
  /**
   * Name of the JSON/form field for the password.
   * @default 'password'
   */
  passwordField?: string
  /**
   * Validate the supplied credentials and return the principal, or `null`
   * if the credentials are invalid.
   *
   * @param creds - Extracted username and password.
   * @param req - The raw request (useful for additional context, e.g., IP).
   * @returns The principal on success, or `null` on failure.
   */
  validate: (
    creds: { username: string; password: string },
    req: Request,
  ) => Promise<TUser | null>
}

/**
 * Username/password strategy. Reads credentials from a JSON body or
 * `application/x-www-form-urlencoded` form. Calls the supplied `validate`
 * callback to authenticate the user.
 *
 * @typeParam TUser - The shape of the authenticated principal.
 *
 * @example
 * new LocalStrategy({
 *   validate: async ({ username, password }) => {
 *     const user = await db.findUser(username)
 *     if (!user) return null
 *     const ok = await verifyPassword(password, user.passwordHash)
 *     return ok ? user : null
 *   },
 * })
 */
export class LocalStrategy<TUser = unknown> extends Strategy<TUser> {
  readonly name = 'local'

  private readonly usernameField: string
  private readonly passwordField: string
  private readonly validateFn: LocalStrategyOptions<TUser>['validate']

  constructor(opts: LocalStrategyOptions<TUser>) {
    super()
    this.usernameField = opts.usernameField ?? 'username'
    this.passwordField = opts.passwordField ?? 'password'
    this.validateFn = opts.validate
  }

  /**
   * Authenticate the request by extracting credentials from the body and
   * calling the `validate` callback.
   *
   * @param req - The incoming request.
   * @param _ctx - The route context (unused).
   * @returns The authenticated principal, or `null`.
   */
  async authenticate(req: Request, _ctx: RouteCtx): Promise<TUser | null> {
    const creds = await this.parseCredentials(req)
    if (!creds) return null
    return this.validateFn(creds, req)
  }

  /**
   * Extract credentials from a JSON or form-urlencoded body.
   *
   * Returns `null` when the body cannot be parsed or the required fields are
   * missing.
   *
   * @param req - The incoming request.
   * @returns Credentials object, or `null`.
   * @internal
   */
  private async parseCredentials(
    req: Request,
  ): Promise<{ username: string; password: string } | null> {
    const contentType = req.headers.get('content-type') ?? ''

    try {
      if (contentType.includes('application/json')) {
        const body = await req.json()
        if (typeof body !== 'object' || body === null) return null
        const record = body as Record<string, unknown>
        const username = record[this.usernameField]
        const password = record[this.passwordField]
        if (typeof username !== 'string' || typeof password !== 'string') {
          return null
        }
        return { username, password }
      }

      if (
        contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('multipart/form-data')
      ) {
        const form = await req.formData()
        const username = form.get(this.usernameField)
        const password = form.get(this.passwordField)
        if (typeof username !== 'string' || typeof password !== 'string') {
          return null
        }
        return { username, password }
      }

      return null
    } catch {
      return null
    }
  }
}
