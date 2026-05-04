import { createFileRoute } from '@tanstack/react-router'
import type { ComponentType } from 'react'

// Static glob — Vite resolves these at build time
const docModules = import.meta.glob('../../docs/**/*.mdx', { eager: true }) as Record<
  string,
  { default: ComponentType }
>

function getDocComponent(slug: string): ComponentType | null {
  const key = `../../docs/${slug}.mdx`
  return docModules[key]?.default ?? null
}

export const Route = createFileRoute('/docs/$')({
  component: () => {
    const { _splat } = Route.useParams()
    const DocComponent = getDocComponent(_splat ?? '')
    return DocComponent ? <DocComponent /> : <div>Page not found</div>
  },
})
