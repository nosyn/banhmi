import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/overview/pipes.mdx'

export const Route = createFileRoute('/docs/overview/pipes')({
  component: () => <Content />,
})
