import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export type DocItem = { slug: string; title: string }
export type DocSection = { items: DocItem[]; slug: string; title: string }
export type DocConfig = { sections: DocSection[] }

export type RouteEntry = {
  itemSlug: string
  itemTitle: string
  mdxPath: string
  routePath: string
  sectionSlug: string
  sectionTitle: string
}

/**
 * Expand the IA config into a flat list of MDX/TSX route entries.
 * Sections with no items emit a single `index` entry.
 *
 * @example
 * generateRouteEntries({ sections: [{ slug: 'a', title: 'A', items: [] }] })
 * // → [{ itemSlug: 'index', itemTitle: 'A', mdxPath: 'src/content/a/index.mdx', ... }]
 */
export function generateRouteEntries(cfg: DocConfig): RouteEntry[] {
  const out: RouteEntry[] = []
  for (const section of cfg.sections) {
    const items =
      section.items.length > 0
        ? section.items
        : [{ slug: 'index', title: section.title }]
    for (const item of items) {
      out.push({
        itemSlug: item.slug,
        itemTitle: item.title,
        mdxPath: `src/content/${section.slug}/${item.slug}.mdx`,
        routePath: `src/routes/docs/${section.slug}.${item.slug}.tsx`,
        sectionSlug: section.slug,
        sectionTitle: section.title,
      })
    }
  }
  return out
}

const STUB_MDX = (entry: RouteEntry) =>
  `# ${entry.itemTitle}

> **Status:** Placeholder. This page will be filled in during the wave that owns it (see \`docs/superpowers/specs/2026-05-08-banhmi-supremacy-master-design.md\`).

## When to use

TBD

## Setup

TBD

## Usage

{/* <CodeFromExample slug="<feature-slug>" /> */}

## API reference

TBD

## See also

TBD
`

const STUB_ROUTE = (entry: RouteEntry) =>
  `import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/${entry.sectionSlug}/${entry.itemSlug}.mdx'

export const Route = createFileRoute('/docs/${entry.sectionSlug}/${entry.itemSlug}')({
  component: () => <Content />,
})
`

async function main(): Promise<void> {
  const cfgPath = join(
    import.meta.dir,
    '..',
    'src',
    'content',
    'doc-routes.json',
  )
  const cfg = JSON.parse(await Bun.file(cfgPath).text()) as DocConfig
  const entries = generateRouteEntries(cfg)
  for (const entry of entries) {
    const mdxAbs = join(import.meta.dir, '..', entry.mdxPath)
    const routeAbs = join(import.meta.dir, '..', entry.routePath)
    if (!existsSync(mdxAbs)) {
      mkdirSync(dirname(mdxAbs), { recursive: true })
      writeFileSync(mdxAbs, STUB_MDX(entry))
    }
    if (!existsSync(routeAbs)) {
      mkdirSync(dirname(routeAbs), { recursive: true })
      writeFileSync(routeAbs, STUB_ROUTE(entry))
    }
  }
  console.log(`generated ${entries.length} route entries`)
}

if (import.meta.main) {
  await main()
}
