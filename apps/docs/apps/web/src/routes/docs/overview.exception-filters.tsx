import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/overview/exception-filters.mdx'

export const Route = createFileRoute('/docs/overview/exception-filters')({
  component: () => <Content />,
})
