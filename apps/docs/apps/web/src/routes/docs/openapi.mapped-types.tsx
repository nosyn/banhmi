import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/openapi/mapped-types.mdx'

export const Route = createFileRoute('/docs/openapi/mapped-types')({
  component: () => <Content />,
})
