import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/openapi/security.mdx'

export const Route = createFileRoute('/docs/openapi/security')({
  component: () => <Content />,
})
