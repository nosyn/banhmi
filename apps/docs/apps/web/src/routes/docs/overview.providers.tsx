import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/overview/providers.mdx'

export const Route = createFileRoute('/docs/overview/providers')({
  component: () => <Content />,
})
