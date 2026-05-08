import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/fundamentals/lazy-loading-modules.mdx'

export const Route = createFileRoute('/docs/fundamentals/lazy-loading-modules')({
  component: () => <Content />,
})
