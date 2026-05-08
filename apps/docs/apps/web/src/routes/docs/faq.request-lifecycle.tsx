import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/faq/request-lifecycle.mdx'

export const Route = createFileRoute('/docs/faq/request-lifecycle')({
  component: () => <Content />,
})
