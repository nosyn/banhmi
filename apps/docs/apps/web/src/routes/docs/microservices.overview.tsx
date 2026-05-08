import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/microservices/overview.mdx'

export const Route = createFileRoute('/docs/microservices/overview')({
  component: () => <Content />,
})
