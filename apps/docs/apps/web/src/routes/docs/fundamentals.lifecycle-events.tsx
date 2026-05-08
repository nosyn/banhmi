import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/fundamentals/lifecycle-events.mdx'

export const Route = createFileRoute('/docs/fundamentals/lifecycle-events')({
  component: () => <Content />,
})
