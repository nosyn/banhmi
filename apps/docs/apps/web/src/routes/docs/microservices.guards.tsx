import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/microservices/guards.mdx'

export const Route = createFileRoute('/docs/microservices/guards')({
  component: () => <Content />,
})
