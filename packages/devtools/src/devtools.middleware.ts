import type { Container, HttpAdapter, ModuleNode } from '@banhmi/core'
import { dumpGraph } from './graph/dump'
import { renderGraphHtml } from './graph/render-html'
import type { ProfileRecorder } from './profile/recorder'
import { renderProfileHtml } from './profile/render-html'
import type { DevtoolsOptions } from './types'

/**
 * Install all devtools HTTP endpoints on the given adapter.
 *
 * Endpoints mounted under `opts.path` (default `/__banhmi/devtools`):
 * - `GET <path>` — HTML index with links.
 * - `GET <path>/graph.json` — {@link DiGraph} as JSON.
 * - `GET <path>/graph` — HTML nested-list view of the DI graph.
 * - `GET <path>/profile.json` — Array of {@link ProfileRecord} (most-recent first).
 * - `GET <path>/profile` — HTML table of recent request records.
 *
 * Requests to non-devtools paths are passed through by calling `next()`.
 *
 * @param adapter - The active {@link HttpAdapter}.
 * @param container - The DI {@link Container}.
 * @param moduleTree - Root {@link ModuleNode}.
 * @param recorder - The shared {@link ProfileRecorder} instance.
 * @param opts - Resolved {@link DevtoolsOptions}.
 *
 * @internal
 */
export function installDevtoolsMiddleware(
  adapter: HttpAdapter,
  container: Container,
  moduleTree: ModuleNode,
  recorder: ProfileRecorder,
  opts: DevtoolsOptions,
): void {
  const base = (opts.path ?? '/__banhmi/devtools').replace(/\/$/, '')

  adapter.use(async (req: Request, next: () => Promise<Response>) => {
    const url = new URL(req.url)
    const path = url.pathname

    // Capture timing for all non-devtools requests
    if (!path.startsWith(base)) {
      const start = performance.now()
      const res = await next()
      const totalMs = performance.now() - start
      recorder.push({
        traceId: crypto.randomUUID(),
        route: path,
        method: req.method,
        statusCode: res.status,
        totalMs,
        stages: [{ name: 'request', durationMs: totalMs }],
        timestamp: Date.now(),
      })
      return res
    }

    if (req.method !== 'GET') return next()

    if (path === `${base}/graph.json`) {
      const graph = dumpGraph(container, moduleTree)
      return Response.json(graph)
    }

    if (path === `${base}/graph`) {
      const graph = dumpGraph(container, moduleTree)
      const html = renderGraphHtml(graph)
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    if (path === `${base}/profile.json`) {
      return Response.json(recorder.list())
    }

    if (path === `${base}/profile`) {
      const html = renderProfileHtml(recorder.list())
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    if (path === base || path === `${base}/`) {
      const html = renderIndexHtml(base)
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    return next()
  })
}

function renderIndexHtml(base: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Banhmi Devtools</title>
  <style>
    body { font-family: monospace; margin: 2rem; background: #0f0f0f; color: #e2e2e2; }
    h1 { color: #a78bfa; }
    ul { list-style: none; padding: 0; }
    li { margin: 0.5rem 0; }
    a { color: #60a5fa; text-decoration: none; font-size: 1.05rem; }
    a:hover { text-decoration: underline; }
    .desc { color: #9ca3af; font-size: 0.85rem; margin-left: 0.5rem; }
  </style>
</head>
<body>
  <h1>Banhmi Devtools</h1>
  <ul>
    <li><a href="${base}/graph">DI Graph (HTML)</a><span class="desc">— visual nested-list of all modules, providers, and their dependencies</span></li>
    <li><a href="${base}/graph.json">graph.json</a><span class="desc">— raw JSON DiGraph for tooling</span></li>
    <li><a href="${base}/profile">Request Profile (HTML)</a><span class="desc">— table of recent HTTP requests with timing</span></li>
    <li><a href="${base}/profile.json">profile.json</a><span class="desc">— raw JSON array of ProfileRecord</span></li>
  </ul>
</body>
</html>`
}
