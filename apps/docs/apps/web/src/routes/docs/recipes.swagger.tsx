import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/swagger.mdx'

export const Route = createFileRoute('/docs/recipes/swagger')({
  component: () => <Content />,
})
