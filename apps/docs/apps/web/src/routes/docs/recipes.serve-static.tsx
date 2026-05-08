import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/serve-static.mdx'

export const Route = createFileRoute('/docs/recipes/serve-static')({
  component: () => <Content />,
})
