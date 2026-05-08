import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/faq/raw-body.mdx'

export const Route = createFileRoute('/docs/faq/raw-body')({
  component: () => <Content />,
})
