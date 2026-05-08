/**
 * Escape HTML special characters to prevent XSS injection.
 * @internal
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Escape a string for safe inclusion in a JS attribute value (single-quoted context).
 * @internal
 */
function escapeJsAttr(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"')
}

/**
 * Render the Scalar API Reference HTML page pointing at the given OpenAPI spec URL.
 *
 * The returned string is a complete, self-contained HTML document that loads the
 * Scalar API Reference UI from the jsDelivr CDN and points it at `specUrl`.
 *
 * @param specUrl - The URL path at which the OpenAPI JSON spec is served.
 * @param opts - Optional rendering options.
 * @param opts.theme - The Scalar theme name (default: `'default'`).
 * @param opts.title - The HTML `<title>` text (default: `'API Reference'`).
 *
 * @example
 * const html = renderScalarHtml('/api/openapi.json', { theme: 'purple', title: 'My API' })
 */
export function renderScalarHtml(
  specUrl: string,
  opts?: { theme?: string; title?: string },
): string {
  const title = opts?.title ?? 'API Reference'
  const theme = opts?.theme ?? 'default'
  return `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(title)}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script id="api-reference" data-url="${escapeHtml(specUrl)}" data-configuration='{"theme":"${escapeJsAttr(theme)}"}'></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`
}
