import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/plugins.mdx'

export const Route = createFileRoute('/docs/graphql/plugins')({
  component: () => <Content />,
})
