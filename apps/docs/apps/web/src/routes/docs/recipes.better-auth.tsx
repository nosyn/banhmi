import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/better-auth.mdx'

export const Route = createFileRoute('/docs/recipes/better-auth')({
  component: () => <Content />,
})
