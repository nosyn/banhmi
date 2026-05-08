import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/microservices/kafka.mdx'

export const Route = createFileRoute('/docs/microservices/kafka')({
  component: () => <Content />,
})
