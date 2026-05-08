import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/typeorm.mdx'

export const Route = createFileRoute('/docs/recipes/typeorm')({
  component: () => <Content />,
})
