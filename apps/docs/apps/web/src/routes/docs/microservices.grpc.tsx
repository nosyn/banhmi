import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/microservices/grpc.mdx'

export const Route = createFileRoute('/docs/microservices/grpc')({
  component: () => <Content />,
})
