import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/openapi/cli-plugin.mdx'

export const Route = createFileRoute('/docs/openapi/cli-plugin')({
  component: () => <Content />,
})
