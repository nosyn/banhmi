import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/cli/libraries.mdx'

export const Route = createFileRoute('/docs/cli/libraries')({
  component: () => <Content />,
})
