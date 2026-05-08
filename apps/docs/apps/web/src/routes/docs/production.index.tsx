import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/production/index.mdx'

export const Route = createFileRoute('/docs/production/index')({
  component: () => <Content />,
})
