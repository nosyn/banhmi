import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/fundamentals/asynchronous-providers.mdx'

export const Route = createFileRoute('/docs/fundamentals/asynchronous-providers')({
  component: () => <Content />,
})
