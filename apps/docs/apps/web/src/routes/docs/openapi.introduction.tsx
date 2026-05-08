import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/openapi/introduction.mdx'

export const Route = createFileRoute('/docs/openapi/introduction')({
  component: () => <Content />,
})
