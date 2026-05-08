import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/deployment/keep-alive.mdx'

export const Route = createFileRoute('/docs/deployment/keep-alive')({
  component: () => <Content />,
})
