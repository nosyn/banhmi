import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/cli/usage.mdx'

export const Route = createFileRoute('/docs/cli/usage')({
  component: () => <Content />,
})
