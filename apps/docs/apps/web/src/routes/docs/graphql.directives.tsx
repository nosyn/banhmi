import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/directives.mdx'

export const Route = createFileRoute('/docs/graphql/directives')({
  component: () => <Content />,
})
