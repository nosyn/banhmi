import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/cqrs.mdx'

export const Route = createFileRoute('/docs/recipes/cqrs')({
  component: () => <Content />,
})
