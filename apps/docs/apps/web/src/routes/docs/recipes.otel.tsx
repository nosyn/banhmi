import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/otel.mdx'

export const Route = createFileRoute('/docs/recipes/otel')({
  component: () => <Content />,
})
