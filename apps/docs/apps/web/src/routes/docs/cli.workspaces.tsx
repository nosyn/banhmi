import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/cli/workspaces.mdx'

export const Route = createFileRoute('/docs/cli/workspaces')({
  component: () => <Content />,
})
