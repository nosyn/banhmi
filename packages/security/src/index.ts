/**
 * @banhmi/security — Helmet, CORS, and CSRF protection for Banhmi applications.
 *
 * Three independently-usable security modules, plus a convenience
 * `SecurityModule.forRoot()` that wires all three at once.
 *
 * @example
 * import { SecurityModule } from '@banhmi/security'
 *
 * \@Module({
 *   imports: [
 *     SecurityModule.forRoot({
 *       helmet: {},
 *       cors: { origin: 'https://app.example.com' },
 *       csrf: {},
 *     }),
 *   ],
 * })
 * class AppModule {}
 */

export type { CorsOptions } from './cors/cors.module'
export { CorsModule } from './cors/cors.module'
export type { CsrfCookieOptions, CsrfOptions } from './csrf/csrf.module'
export { CsrfModule } from './csrf/csrf.module'
export type { HelmetOptions } from './helmet/helmet.module'
export { HelmetModule } from './helmet/helmet.module'
export type { SecurityModuleOptions } from './security.module'
export { SecurityModule } from './security.module'
export { CORS_OPTIONS, CSRF_OPTIONS, HELMET_OPTIONS } from './tokens'
