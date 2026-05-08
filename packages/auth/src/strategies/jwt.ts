import type { RouteCtx } from '@banhmi/common'
import { JwtService } from '@banhmi/jwt'
import type { JWTPayload } from 'jose'
import { Strategy } from '../strategy'

/**
 * Extract a Bearer token from the `Authorization` header.
 *
 * @param req - The incoming request.
 * @returns The raw token string, or `null` if not present or malformed.
 *
 * @example
 * const token = bearerToken(req) // 'eyJ...' or null
 */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

/**
 * Options for {@link JwtStrategy}.
 *
 * @typeParam TPayload - The expected JWT payload shape.
 */
export type JwtStrategyOptions = {
  /** Shared secret for HS256 JWT verification. */
  secret: string
  /**
   * Custom token extractor. Receives the raw request and must return the
   * raw JWT string, or `null` if absent.
   *
   * @default bearerToken — reads `Authorization: Bearer <token>`
   *
   * @example
   * extract: (req) => new URL(req.url).searchParams.get('token')
   */
  extract?: (req: Request) => string | null
  /** Optional issuer claim to validate. */
  issuer?: string
  /** Optional audience claim to validate. */
  audience?: string
}

/**
 * JWT Bearer-token authentication strategy. Verifies the token using
 * {@link JwtService} (HS256) and returns the decoded payload on success.
 *
 * @typeParam TPayload - The expected JWT payload shape.
 *
 * @example
 * new JwtStrategy({ secret: Bun.env.JWT_SECRET ?? 'dev-secret' })
 */
export class JwtStrategy<
  TPayload extends JWTPayload = JWTPayload,
> extends Strategy<TPayload> {
  readonly name = 'jwt'

  private readonly service: JwtService
  private readonly extractFn: (req: Request) => string | null

  constructor(opts: JwtStrategyOptions) {
    super()
    this.service = new JwtService({
      secret: opts.secret,
      issuer: opts.issuer,
      audience: opts.audience,
    })
    this.extractFn = opts.extract ?? bearerToken
  }

  /**
   * Authenticate the request by extracting and verifying the JWT.
   *
   * @param req - The incoming request.
   * @param _ctx - The route context (unused).
   * @returns The decoded payload, or `null` if the token is missing or invalid.
   */
  async authenticate(req: Request, _ctx: RouteCtx): Promise<TPayload | null> {
    const token = this.extractFn(req)
    if (!token) return null
    try {
      const payload = await this.service.verify(token)
      return payload as TPayload
    } catch {
      return null
    }
  }
}
