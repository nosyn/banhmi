import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/openapi/operations.mdx'

export const Route = createFileRoute('/docs/openapi/operations')({
  component: () => <Content />,
})
