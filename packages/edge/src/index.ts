/**
 * `@banhmi/edge` — edge-runtime adapter for Banhmi.
 *
 * Provides `createEdgeHandler` which bootstraps a Banhmi application and
 * exposes a WinterCG-compatible `(req: Request) => Promise<Response>` handler
 * suitable for Cloudflare Workers, Vercel Edge Functions, and Deno Deploy.
 *
 * @example
 * // Cloudflare Workers (wrangler.toml: main = "src/index.ts")
 * import { createEdgeHandler } from '@banhmi/edge'
 * import { AppModule } from './app.module'
 * export default { fetch: await createEdgeHandler(AppModule) }
 *
 * @module
 */

export { createEdgeHandler } from './edge-adapter'
export type { EdgeHandlerOptions } from './types'
