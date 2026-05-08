import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/faq/hybrid-application.mdx'

export const Route = createFileRoute('/docs/faq/hybrid-application')({
  component: () => <Content />,
})
