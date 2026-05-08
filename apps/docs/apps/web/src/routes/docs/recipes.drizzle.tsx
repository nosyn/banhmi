import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/drizzle.mdx'

export const Route = createFileRoute('/docs/recipes/drizzle')({
  component: () => <Content />,
})
