import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/openapi/decorators.mdx'

export const Route = createFileRoute('/docs/openapi/decorators')({
  component: () => <Content />,
})
