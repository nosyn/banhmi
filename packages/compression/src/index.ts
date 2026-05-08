/**
 * @banhmi/compression — Bun-native gzip/deflate response compression for Banhmi.
 *
 * Import {@link CompressionModule} and call `forRoot()` to register a middleware
 * that automatically compresses outgoing responses. Encoding is negotiated from
 * the client's `Accept-Encoding` header via `Bun.gzip()` / `Bun.deflate()`.
 *
 * @example
 * import { CompressionModule } from '@banhmi/compression'
 *
 * \@Module({ imports: [CompressionModule.forRoot()] })
 * class AppModule {}
 */

export {
  CompressionMiddleware,
  defaultFilter,
  negotiateEncoding,
} from './compression.middleware'
export type { CompressionOptions } from './compression.module'
export { CompressionModule } from './compression.module'
export { COMPRESSION_OPTIONS } from './tokens'
