/**
 * @banhmi/versioning — API versioning for Banhmi controllers and handlers.
 *
 * Provides three strategies for resolving the requested API version:
 * URI path segments (`/v1/cats`), a custom request header, and `Accept`
 * header media-type vendor extensions. Versioned handlers only match
 * requests that carry the declared version; unversioned handlers always match.
 *
 * @example
 * import { VersioningModule, Version } from '@banhmi/versioning'
 *
 * \@Module({ imports: [VersioningModule.forRoot({ type: 'uri', prefix: 'v' })] })
 * class AppModule {}
 *
 * \@Version('1')
 * \@Controller('cats')
 * class CatsV1Controller {
 *   \@Get()
 *   findAll() { return [{ name: 'Kitty', version: 1 }] }
 * }
 */

export { VERSION_METADATA, VERSIONING_OPTIONS } from './tokens'
export { Version } from './version.decorator'
export { resolveVersion } from './version-resolver'
export type { VersioningOptions } from './versioning.module'
export { VersioningModule } from './versioning.module'
