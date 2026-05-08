import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/microservices/interceptors.mdx'

export const Route = createFileRoute('/docs/microservices/interceptors')({
  component: () => <Content />,
})
