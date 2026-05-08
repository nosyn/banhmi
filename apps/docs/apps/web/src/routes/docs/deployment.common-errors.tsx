import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/deployment/common-errors.mdx'

export const Route = createFileRoute('/docs/deployment/common-errors')({
  component: () => <Content />,
})
