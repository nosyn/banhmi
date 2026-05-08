import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/fundamentals/discovery-service.mdx'

export const Route = createFileRoute('/docs/fundamentals/discovery-service')({
  component: () => <Content />,
})
