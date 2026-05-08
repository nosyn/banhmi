import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/openapi/other-features.mdx'

export const Route = createFileRoute('/docs/openapi/other-features')({
  component: () => <Content />,
})
