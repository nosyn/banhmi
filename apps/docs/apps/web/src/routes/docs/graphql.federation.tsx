import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/federation.mdx'

export const Route = createFileRoute('/docs/graphql/federation')({
  component: () => <Content />,
})
