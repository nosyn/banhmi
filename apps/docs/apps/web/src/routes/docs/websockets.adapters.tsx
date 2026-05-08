import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/websockets/adapters.mdx'

export const Route = createFileRoute('/docs/websockets/adapters')({
  component: () => <Content />,
})
