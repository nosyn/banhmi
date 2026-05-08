import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/fundamentals/platform-agnosticism.mdx'

export const Route = createFileRoute('/docs/fundamentals/platform-agnosticism')({
  component: () => <Content />,
})
