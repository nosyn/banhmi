import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/overview/guards.mdx'

export const Route = createFileRoute('/docs/overview/guards')({
  component: () => <Content />,
})
