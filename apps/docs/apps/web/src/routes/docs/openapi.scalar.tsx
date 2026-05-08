import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/openapi/scalar.mdx'

export const Route = createFileRoute('/docs/openapi/scalar')({
  component: () => <Content />,
})
