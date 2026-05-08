import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/fundamentals/custom-providers.mdx'

export const Route = createFileRoute('/docs/fundamentals/custom-providers')({
  component: () => <Content />,
})
