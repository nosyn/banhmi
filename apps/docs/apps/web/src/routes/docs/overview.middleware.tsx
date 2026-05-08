import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/overview/middleware.mdx'

export const Route = createFileRoute('/docs/overview/middleware')({
  component: () => <Content />,
})
