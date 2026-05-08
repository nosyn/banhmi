import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/fundamentals/testing.mdx'

export const Route = createFileRoute('/docs/fundamentals/testing')({
  component: () => <Content />,
})
