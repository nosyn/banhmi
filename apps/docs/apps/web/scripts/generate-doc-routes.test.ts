import { expect, test } from 'bun:test'
import { generateRouteEntries } from './generate-doc-routes'

test('generator emits one entry per item', () => {
  const out = generateRouteEntries({
    sections: [
      {
        slug: 'overview',
        title: 'Overview',
        items: [{ slug: 'controllers', title: 'Controllers' }],
      },
    ],
  })
  expect(out).toEqual([
    {
      itemSlug: 'controllers',
      itemTitle: 'Controllers',
      mdxPath: 'src/content/overview/controllers.mdx',
      routePath: 'src/routes/docs/overview.controllers.tsx',
      sectionSlug: 'overview',
      sectionTitle: 'Overview',
    },
  ])
})

test('generator emits a section index when items is empty', () => {
  const out = generateRouteEntries({
    sections: [
      { slug: 'production', title: 'Production Checklist', items: [] },
    ],
  })
  expect(out).toHaveLength(1)
  expect(out[0].itemSlug).toBe('index')
})
