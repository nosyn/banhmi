import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/faq/common-errors.mdx'

export const Route = createFileRoute('/docs/faq/common-errors')({
  component: () => <Content />,
})
