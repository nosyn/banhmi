import type { ProfileRecord } from '../types'

/**
 * Render a collection of profile records as an HTML page with a summary table.
 *
 * Records are displayed most-recent first (caller should pass them in that order).
 *
 * @param records - Array of {@link ProfileRecord} to render.
 * @returns A complete HTML document string.
 */
export function renderProfileHtml(records: ProfileRecord[]): string {
  const rows = records
    .map((r) => {
      const date = new Date(r.timestamp).toISOString()
      const stages = r.stages
        .map((s) => `${s.name}: ${s.durationMs.toFixed(2)}ms`)
        .join(', ')
      return `<tr>
        <td>${escHtml(r.traceId.slice(0, 8))}&hellip;</td>
        <td>${escHtml(r.method)}</td>
        <td>${escHtml(r.route)}</td>
        <td>${r.statusCode}</td>
        <td>${r.totalMs.toFixed(2)}</td>
        <td>${escHtml(stages)}</td>
        <td>${escHtml(date)}</td>
      </tr>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Banhmi Devtools — Request Profile</title>
  <style>
    body { font-family: monospace; margin: 2rem; background: #0f0f0f; color: #e2e2e2; }
    h1 { color: #a78bfa; margin-bottom: 1rem; }
    nav { margin-bottom: 1.5rem; }
    nav a { color: #60a5fa; margin-right: 1rem; text-decoration: none; }
    nav a:hover { text-decoration: underline; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { background: #1e1e2e; color: #a78bfa; text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #333; }
    td { padding: 0.4rem 0.75rem; border-bottom: 1px solid #222; vertical-align: top; }
    tr:hover td { background: #1a1a2e; }
    .empty { color: #666; font-style: italic; }
  </style>
</head>
<body>
  <h1>Request Profile</h1>
  <nav>
    <a href=".">Index</a>
    <a href="graph">DI Graph</a>
    <a href="graph.json">graph.json</a>
    <a href="profile.json">profile.json</a>
  </nav>
  <table>
    <thead>
      <tr>
        <th>Trace ID</th>
        <th>Method</th>
        <th>Route</th>
        <th>Status</th>
        <th>Total (ms)</th>
        <th>Stages</th>
        <th>Timestamp</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="7" class="empty">No records yet. Make some requests to populate this table.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
