import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/overview/modules.mdx'

export const Route = createFileRoute('/docs/overview/modules')({
  component: () => <Content />,
})
