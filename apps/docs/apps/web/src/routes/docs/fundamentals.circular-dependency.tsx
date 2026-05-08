import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/fundamentals/circular-dependency.mdx'

export const Route = createFileRoute('/docs/fundamentals/circular-dependency')({
  component: () => <Content />,
})
