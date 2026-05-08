import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/crud-generator.mdx'

export const Route = createFileRoute('/docs/recipes/crud-generator')({
  component: () => <Content />,
})
