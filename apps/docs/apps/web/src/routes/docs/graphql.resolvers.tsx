import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/resolvers.mdx'

export const Route = createFileRoute('/docs/graphql/resolvers')({
  component: () => <Content />,
})
