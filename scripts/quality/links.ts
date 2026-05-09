/**
 * MDX relative-link checker.
 *
 * Scans every .mdx file under apps/docs/apps/web/src/content/ for markdown
 * links of the form [text](/section/slug) and verifies each path resolves to
 * a known doc route (from doc-routes.json) or a known MDX file on disk.
 *
 * Exits 0 if clean, 1 if broken links are found.
 */
import { Glob } from 'bun'
import { join } from 'node:path'

const CONTENT_DIR = 'apps/docs/apps/web/src/content'
const ROUTES_JSON = `${CONTENT_DIR}/doc-routes.json`

// ---------------------------------------------------------------------------
// Build set of valid doc routes from doc-routes.json
// ---------------------------------------------------------------------------

type RouteItem = { slug: string; title: string }
type RouteSection = { slug: string; title: string; items?: RouteItem[] }
type RoutesJson = { sections: RouteSection[] }

async function buildKnownRoutes(): Promise<Set<string>> {
  const data: RoutesJson = await Bun.file(ROUTES_JSON).json()
  const known = new Set<string>()
  for (const section of data.sections) {
    known.add(`/${section.slug}`)
    for (const item of section.items ?? []) {
      known.add(`/${section.slug}/${item.slug}`)
    }
  }
  return known
}

// ---------------------------------------------------------------------------
// Build set of valid MDX files on disk (relative paths like /security/cors)
// ---------------------------------------------------------------------------

async function buildKnownFiles(): Promise<Set<string>> {
  const known = new Set<string>()
  const glob = new Glob('**/*.mdx')
  for await (const rel of glob.scan({ cwd: CONTENT_DIR })) {
    // e.g. "security/cors.mdx" → "/security/cors"
    const route = `/${rel.replace(/\.mdx$/, '')}`
    known.add(route)
    // also accept "/security/cors/index" style
    if (route.endsWith('/index')) {
      known.add(route.slice(0, -'/index'.length))
    }
  }
  return known
}

// ---------------------------------------------------------------------------
// Extract [text](path) links from MDX source
// ---------------------------------------------------------------------------

const LINK_RE = /\[(?:[^\]]*)\]\(([^)]+)\)/g

type BrokenLink = { file: string; line: number; link: string }

function extractLinks(source: string): Array<{ link: string; line: number }> {
  const results: Array<{ link: string; line: number }> = []
  const lines = source.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let m: RegExpExecArray | null
    LINK_RE.lastIndex = 0
    // biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop
    while ((m = LINK_RE.exec(line)) !== null) {
      const href = m[1].trim()
      // only check internal doc links (starting with /)
      if (href.startsWith('/') && !href.startsWith('//')) {
        // strip anchor fragments
        const path = href.split('#')[0]
        if (path) results.push({ link: path, line: i + 1 })
      }
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  if (!Bun.file(ROUTES_JSON).size) {
    console.error(`links: cannot find ${ROUTES_JSON} — run from repo root`)
    return 1
  }

  const [knownRoutes, knownFiles] = await Promise.all([
    buildKnownRoutes(),
    buildKnownFiles(),
  ])

  const allKnown = new Set([...knownRoutes, ...knownFiles])

  const glob = new Glob(`${CONTENT_DIR}/**/*.mdx`)
  const broken: BrokenLink[] = []
  let fileCount = 0

  for await (const filePath of glob.scan({ cwd: process.cwd() })) {
    fileCount++
    const source = await Bun.file(filePath).text()
    const links = extractLinks(source)
    for (const { line, link } of links) {
      if (!allKnown.has(link)) {
        broken.push({ file: filePath, line, link })
      }
    }
  }

  if (fileCount === 0) {
    console.error('links: no MDX files found — are you running from the repo root?')
    return 1
  }

  if (broken.length === 0) {
    console.log(`links: clean (${fileCount} files, 0 broken links)`)
    return 0
  }

  for (const { file, line, link } of broken) {
    console.log(`${file}:${line}: broken link → ${link}`)
  }
  console.log(`\nlinks: ${broken.length} broken link(s) across ${fileCount} files`)
  return 1
}

if (import.meta.main) {
  process.exit(await main())
}
