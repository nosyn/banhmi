import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/faq/examples.mdx'

export const Route = createFileRoute('/docs/faq/examples')({
  component: () => <Content />,
})
