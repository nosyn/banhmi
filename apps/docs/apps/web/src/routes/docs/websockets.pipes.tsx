import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/websockets/pipes.mdx'

export const Route = createFileRoute('/docs/websockets/pipes')({
  component: () => <Content />,
})
