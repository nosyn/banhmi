import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/complexity.mdx'

export const Route = createFileRoute('/docs/graphql/complexity')({
  component: () => <Content />,
})
