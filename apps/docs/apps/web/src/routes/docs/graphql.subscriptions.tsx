import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/subscriptions.mdx'

export const Route = createFileRoute('/docs/graphql/subscriptions')({
  component: () => <Content />,
})
