import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/deployment/edge.mdx'

export const Route = createFileRoute('/docs/deployment/edge')({
  component: () => <Content />,
})
