/**
 * Render the classic Swagger UI HTML page pointing at the given OpenAPI spec URL.
 *
 * Loads Swagger UI assets from the unpkg CDN. Use this renderer when you need the
 * traditional Swagger UI look; prefer {@link renderScalarHtml} for a modern UI.
 *
 * @param specUrl - The URL path at which the OpenAPI JSON spec is served.
 * @param opts - Optional rendering options.
 * @param opts.title - The HTML `<title>` text (default: `'Swagger UI'`).
 *
 * @example
 * const html = renderSwaggerHtml('/api/openapi.json', { title: 'My API Docs' })
 */
export function renderSwaggerHtml(
  specUrl: string,
  opts?: { title?: string },
): string {
  const title = opts?.title ?? 'Swagger UI'
  return `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
<script>
  SwaggerUIBundle({ url: '${specUrl}', dom_id: '#swagger-ui' })
</script>
</body>
</html>`
}
