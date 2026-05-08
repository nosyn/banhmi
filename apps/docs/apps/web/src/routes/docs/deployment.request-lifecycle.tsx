import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/deployment/request-lifecycle.mdx'

export const Route = createFileRoute('/docs/deployment/request-lifecycle')({
  component: () => <Content />,
})
