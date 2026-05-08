import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/compodoc.mdx'

export const Route = createFileRoute('/docs/recipes/compodoc')({
  component: () => <Content />,
})
