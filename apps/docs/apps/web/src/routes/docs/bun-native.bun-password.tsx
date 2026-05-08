import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/bun-native/bun-password.mdx'

export const Route = createFileRoute('/docs/bun-native/bun-password')({
  component: () => <Content />,
})
