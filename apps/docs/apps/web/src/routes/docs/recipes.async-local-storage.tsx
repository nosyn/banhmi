import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/async-local-storage.mdx'

export const Route = createFileRoute('/docs/recipes/async-local-storage')({
  component: () => <Content />,
})
