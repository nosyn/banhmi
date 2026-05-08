import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/compression.mdx'

export const Route = createFileRoute('/docs/techniques/compression')({
  component: () => <Content />,
})
