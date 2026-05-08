import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/microservices/custom-transporters.mdx'

export const Route = createFileRoute('/docs/microservices/custom-transporters')({
  component: () => <Content />,
})
