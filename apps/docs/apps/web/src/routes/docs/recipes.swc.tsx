import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/swc.mdx'

export const Route = createFileRoute('/docs/recipes/swc')({
  component: () => <Content />,
})
