import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/cli/overview.mdx'

export const Route = createFileRoute('/docs/cli/overview')({
  component: () => <Content />,
})
