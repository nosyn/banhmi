import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/deployment/hot-reload.mdx'

export const Route = createFileRoute('/docs/deployment/hot-reload')({
  component: () => <Content />,
})
