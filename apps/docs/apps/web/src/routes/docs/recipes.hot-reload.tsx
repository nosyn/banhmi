import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/hot-reload.mdx'

export const Route = createFileRoute('/docs/recipes/hot-reload')({
  component: () => <Content />,
})
