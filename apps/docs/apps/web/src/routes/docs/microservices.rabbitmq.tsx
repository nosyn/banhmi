import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/microservices/rabbitmq.mdx'

export const Route = createFileRoute('/docs/microservices/rabbitmq')({
  component: () => <Content />,
})
