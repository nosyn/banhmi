/**
 * Edge Worker entry point.
 *
 * In a real Cloudflare Workers / Vercel Edge deployment this file exports
 * `default { fetch }`.  For local dev via `bun run dev` we wrap the handler
 * in a minimal `Bun.serve` call so you can test it without deploying.
 *
 * @example
 * bun run dev
 * curl http://localhost:4200/
 * curl http://localhost:4200/health
 */
import { createEdgeHandler } from '@banhmi/edge'
import { AppModule } from './app.module'

const fetch = await createEdgeHandler(AppModule)

// Export Cloudflare Workers compatible module
export default { fetch }

// Local dev server — only starts when run directly with Bun
if (process.env['BUN_ENV'] !== 'test') {
  const port = Number(process.env['PORT'] ?? 4200)
  Bun.serve({ port, fetch })
  console.log(`Edge worker running at http://localhost:${port}`)
}
