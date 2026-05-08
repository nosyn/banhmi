import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/prisma.mdx'

export const Route = createFileRoute('/docs/recipes/prisma')({
  component: () => <Content />,
})
