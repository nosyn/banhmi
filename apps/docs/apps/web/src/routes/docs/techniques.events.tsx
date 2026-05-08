import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/events.mdx'

export const Route = createFileRoute('/docs/techniques/events')({
  component: () => <Content />,
})
