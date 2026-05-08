import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/microservices/exception-filters.mdx'

export const Route = createFileRoute('/docs/microservices/exception-filters')({
  component: () => <Content />,
})
