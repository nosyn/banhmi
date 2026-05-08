import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/fundamentals/execution-context.mdx'

export const Route = createFileRoute('/docs/fundamentals/execution-context')({
  component: () => <Content />,
})
