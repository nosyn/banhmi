import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/performance/tuning.mdx'

export const Route = createFileRoute('/docs/performance/tuning')({
  component: () => <Content />,
})
