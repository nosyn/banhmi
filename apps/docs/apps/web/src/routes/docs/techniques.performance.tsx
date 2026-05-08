import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/performance.mdx'

export const Route = createFileRoute('/docs/techniques/performance')({
  component: () => <Content />,
})
