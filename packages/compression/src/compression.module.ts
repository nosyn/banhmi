import { Module } from '@banhmi/common'
import { CompressionMiddleware } from './compression.middleware'
import { COMPRESSION_OPTIONS } from './tokens'

/**
 * Configuration options for {@link CompressionModule.forRoot}.
 *
 * @example
 * CompressionModule.forRoot({
 *   threshold: 512,
 *   encodings: ['gzip', 'deflate'],
 *   level: 6,
 * })
 */
export type CompressionOptions = {
  /**
   * Minimum response body size in bytes required to trigger compression.
   * Responses smaller than this value are passed through uncompressed.
   * Default `1024`.
   */
  threshold?: number
  /**
   * Ordered list of content encodings the server is willing to apply.
   * Negotiated against the client's `Accept-Encoding` header; the first
   * match wins. Default `['gzip']`.
   */
  encodings?: Array<'gzip' | 'deflate'>
  /**
   * zlib compression level `1` (fastest) through `9` (best compression).
   * Default `6`.
   */
  level?: number
  /**
   * Predicate that receives the response `content-type` and returns `true`
   * when the content should be compressed. Default: compress text, JSON,
   * JavaScript, CSS, SVG, and XML content types.
   *
   * @example
   * filter: (ct) => ct.includes('application/json')
   */
  filter?: (contentType: string) => boolean
}

/**
 * Bun-native response compression module.
 *
 * Call {@link CompressionModule.forRoot} to register a middleware that
 * compresses outgoing responses using `Bun.gzip()` or `Bun.deflate()`.
 * Encoding is negotiated from the client's `Accept-Encoding` header.
 *
 * @example
 * import { CompressionModule } from '@banhmi/compression'
 *
 * \@Module({ imports: [CompressionModule.forRoot()] })
 * class AppModule {}
 *
 * const app = await BanhmiFactory.create(AppModule)
 * await app.listen(3000)
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class CompressionModule {
  /**
   * Create a configured compression module that can be imported into any
   * Banhmi `@Module`.
   *
   * @param opts - Compression options. All fields are optional with sensible
   *   defaults.
   * @returns A dynamically-created `@Module` class that registers
   *   {@link CompressionMiddleware} and the {@link COMPRESSION_OPTIONS} token.
   *
   * @example
   * CompressionModule.forRoot({ threshold: 512, level: 9 })
   */
  static forRoot(opts: CompressionOptions = {}) {
    @Module({
      providers: [
        {
          provide: COMPRESSION_OPTIONS,
          useValue: opts,
        },
        CompressionMiddleware,
      ],
    })
    class CompressionRootModule {}

    return CompressionRootModule
  }
}
