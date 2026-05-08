import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/bun-native/bun-s3.mdx'

export const Route = createFileRoute('/docs/bun-native/bun-s3')({
  component: () => <Content />,
})
