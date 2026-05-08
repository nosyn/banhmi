import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/microservices/nats.mdx'

export const Route = createFileRoute('/docs/microservices/nats')({
  component: () => <Content />,
})
