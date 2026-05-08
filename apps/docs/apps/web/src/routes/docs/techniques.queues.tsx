import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/queues.mdx'

export const Route = createFileRoute('/docs/techniques/queues')({
  component: () => <Content />,
})
