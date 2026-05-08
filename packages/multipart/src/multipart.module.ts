import { Module } from '@banhmi/common'
import { MULTIPART_OPTIONS } from './tokens'
import type { MultipartOptions } from './types'

/**
 * Multipart file upload module.
 *
 * Call {@link MultipartModule.forRoot} to register {@link MULTIPART_OPTIONS}
 * in the DI container. The registered options are used as defaults by
 * `@UploadedFile` and `@UploadedFiles` when no inline options are passed.
 *
 * @example
 * \@Module({
 *   imports: [MultipartModule.forRoot({ fileSize: 10_000_000, files: 5 })],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class MultipartModule {
  /**
   * Register multipart options globally.
   *
   * @param opts - Upload limits and storage options.
   * @returns A dynamically-created `@Module` that provides
   *   the {@link MULTIPART_OPTIONS} token.
   *
   * @example
   * MultipartModule.forRoot({ fileSize: 5_000_000, files: 10 })
   */
  static forRoot(opts: MultipartOptions = {}) {
    @Module({
      providers: [
        {
          provide: MULTIPART_OPTIONS,
          useValue: opts,
        },
      ],
      exports: [MULTIPART_OPTIONS],
    })
    class MultipartRootModule {}

    return MultipartRootModule
  }
}
