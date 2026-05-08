import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/devtools/overview.mdx'

export const Route = createFileRoute('/docs/devtools/overview')({
  component: () => <Content />,
})
