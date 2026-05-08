import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/microservices/pipes.mdx'

export const Route = createFileRoute('/docs/microservices/pipes')({
  component: () => <Content />,
})
