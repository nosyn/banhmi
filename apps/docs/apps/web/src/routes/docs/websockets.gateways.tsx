import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/websockets/gateways.mdx'

export const Route = createFileRoute('/docs/websockets/gateways')({
  component: () => <Content />,
})
