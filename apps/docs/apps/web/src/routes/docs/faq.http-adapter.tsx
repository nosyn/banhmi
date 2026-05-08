import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/faq/http-adapter.mdx'

export const Route = createFileRoute('/docs/faq/http-adapter')({
  component: () => <Content />,
})
