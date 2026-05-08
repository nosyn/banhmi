import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/bun-native/bun-sql.mdx'

export const Route = createFileRoute('/docs/bun-native/bun-sql')({
  component: () => <Content />,
})
