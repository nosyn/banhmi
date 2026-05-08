import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/sse.mdx'

export const Route = createFileRoute('/docs/techniques/sse')({
  component: () => <Content />,
})
