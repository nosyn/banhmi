import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/cli/scripts.mdx'

export const Route = createFileRoute('/docs/cli/scripts')({
  component: () => <Content />,
})
