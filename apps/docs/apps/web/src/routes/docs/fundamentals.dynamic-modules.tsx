import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/fundamentals/dynamic-modules.mdx'

export const Route = createFileRoute('/docs/fundamentals/dynamic-modules')({
  component: () => <Content />,
})
