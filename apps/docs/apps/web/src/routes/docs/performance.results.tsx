import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/performance/results.mdx'

export const Route = createFileRoute('/docs/performance/results')({
  component: () => <Content />,
})
