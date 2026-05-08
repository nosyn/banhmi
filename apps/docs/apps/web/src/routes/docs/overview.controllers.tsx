import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/overview/controllers.mdx'

export const Route = createFileRoute('/docs/overview/controllers')({
  component: () => <Content />,
})
