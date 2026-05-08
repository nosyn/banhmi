import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/cli-plugin.mdx'

export const Route = createFileRoute('/docs/graphql/cli-plugin')({
  component: () => <Content />,
})
