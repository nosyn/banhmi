import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/mikroorm.mdx'

export const Route = createFileRoute('/docs/recipes/mikroorm')({
  component: () => <Content />,
})
