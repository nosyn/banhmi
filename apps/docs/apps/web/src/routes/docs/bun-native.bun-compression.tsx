import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/bun-native/bun-compression.mdx'

export const Route = createFileRoute('/docs/bun-native/bun-compression')({
  component: () => <Content />,
})
