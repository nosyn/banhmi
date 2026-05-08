import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/microservices/mqtt.mdx'

export const Route = createFileRoute('/docs/microservices/mqtt')({
  component: () => <Content />,
})
