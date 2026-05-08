import type { OnApplicationBootstrap } from '@banhmi/common'
import type { HttpAdapter } from '@banhmi/core'
import { HTTP_ADAPTER_TOKEN } from '@banhmi/platform-bun'
import type { CompressionOptions } from './compression.module'
import { COMPRESSION_OPTIONS } from './tokens'

/** Middleware function type used internally. */
type MiddlewareFn = (
  req: Request,
  next: () => Promise<Response>,
) => Promise<Response>

/**
 * Returns `true` if the given content-type string should be compressed by default.
 * Covers text, JSON, JavaScript, CSS, SVG, and XML content types.
 *
 * @param contentType - The value of the `content-type` response header.
 *
 * @example
 * defaultFilter('application/json') // true
 * defaultFilter('image/png')        // false
 */
export function defaultFilter(contentType: string): boolean {
  const ct = contentType.toLowerCase()
  return (
    ct.includes('text/') ||
    ct.includes('application/json') ||
    ct.includes('application/javascript') ||
    ct.includes('application/x-javascript') ||
    ct.includes('text/javascript') ||
    ct.includes('text/css') ||
    ct.includes('image/svg+xml') ||
    ct.includes('application/xml') ||
    ct.includes('text/xml')
  )
}

/**
 * Negotiate the best supported encoding from an `Accept-Encoding` header value.
 * Returns the first encoding from `preferred` that the client accepts, or `null`
 * if no match is found.
 *
 * @param acceptEncoding - The value of the client's `Accept-Encoding` header.
 * @param preferred - Ordered list of encodings the server supports.
 *
 * @example
 * negotiateEncoding('gzip, deflate', ['gzip', 'deflate']) // 'gzip'
 * negotiateEncoding('br', ['gzip', 'deflate'])            // null
 */
export function negotiateEncoding(
  acceptEncoding: string,
  preferred: Array<'gzip' | 'deflate'>,
): 'gzip' | 'deflate' | null {
  const accepted = acceptEncoding
    .split(',')
    .map((part) => {
      const [enc, q] = part.trim().split(';q=')
      return {
        enc: (enc ?? '').trim().toLowerCase(),
        q: q !== undefined ? Number.parseFloat(q) : 1,
      }
    })
    .filter((e) => e.q > 0)
    .map((e) => e.enc)

  for (const enc of preferred) {
    if (accepted.includes(enc) || accepted.includes('*')) {
      return enc
    }
  }
  return null
}

/**
 * Bun-native response compression middleware that wraps outgoing `Response`
 * bodies with gzip or deflate encoding based on `Accept-Encoding` negotiation.
 *
 * Installed as request middleware via {@link HTTP_ADAPTER_TOKEN} on application
 * bootstrap. Registered automatically by {@link CompressionModule.forRoot}.
 *
 * @example
 * // Registered automatically:
 * CompressionModule.forRoot({ threshold: 512, encodings: ['gzip', 'deflate'] })
 */
export class CompressionMiddleware implements OnApplicationBootstrap {
  static inject = [COMPRESSION_OPTIONS, HTTP_ADAPTER_TOKEN] as const

  private readonly threshold: number
  private readonly encodings: Array<'gzip' | 'deflate'>
  private readonly level: number
  private readonly filter: (contentType: string) => boolean

  constructor(
    readonly opts: CompressionOptions,
    private readonly adapter: HttpAdapter,
  ) {
    this.threshold = opts.threshold ?? 1024
    this.encodings = opts.encodings ?? ['gzip']
    this.level = opts.level ?? 6
    this.filter = opts.filter ?? defaultFilter
  }

  /**
   * Called by the framework at application bootstrap. Installs the compression
   * middleware on the HTTP adapter.
   */
  onApplicationBootstrap(): void {
    const middleware = this.buildMiddleware()
    this.adapter.use(middleware)
  }

  /**
   * Build and return the raw middleware function. Exposed for standalone use
   * in tests without needing the full application lifecycle.
   *
   * @example
   * const mw = middleware.buildMiddleware()
   * const res = await mw(new Request('http://localhost/'), next)
   */
  buildMiddleware(): MiddlewareFn {
    return async (req: Request, next: () => Promise<Response>) => {
      const response = await next()

      const acceptEncoding = req.headers.get('accept-encoding') ?? ''

      // Skip if no supported encoding advertised
      const encoding = negotiateEncoding(acceptEncoding, this.encodings)
      if (!encoding) {
        return this.addVaryHeader(response)
      }

      // Skip if already encoded
      if (response.headers.get('content-encoding')) {
        return this.addVaryHeader(response)
      }

      // Skip based on content-type filter
      const contentType = response.headers.get('content-type') ?? ''
      if (!this.filter(contentType)) {
        return this.addVaryHeader(response)
      }

      // Read body
      const buf = new Uint8Array(await response.arrayBuffer())

      // Skip if under threshold
      if (buf.byteLength < this.threshold) {
        return this.addVaryHeader(response)
      }

      // Compress
      const compressed =
        encoding === 'gzip'
          ? Bun.gzipSync(buf, { level: this.level })
          : Bun.deflateSync(buf, { level: this.level })

      const newHeaders = new Headers(response.headers)
      newHeaders.set('content-encoding', encoding)
      newHeaders.set('content-length', String(compressed.byteLength))
      newHeaders.set('vary', 'accept-encoding')

      return new Response(compressed, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })
    }
  }

  private addVaryHeader(response: Response): Response {
    // Always add Vary: accept-encoding so caches know the response varies by encoding
    const cloned = new Response(response.body, response)
    cloned.headers.set('vary', 'accept-encoding')
    return cloned
  }
}
