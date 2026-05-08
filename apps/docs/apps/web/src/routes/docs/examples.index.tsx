import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/examples/index.mdx'

export const Route = createFileRoute('/docs/examples/')({
  component: () => <Content />,
})
