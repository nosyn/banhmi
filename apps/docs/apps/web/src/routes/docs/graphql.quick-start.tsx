import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/quick-start.mdx'

export const Route = createFileRoute('/docs/graphql/quick-start')({
  component: () => <Content />,
})
