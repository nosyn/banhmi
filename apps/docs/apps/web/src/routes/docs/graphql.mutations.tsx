import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/mutations.mdx'

export const Route = createFileRoute('/docs/graphql/mutations')({
  component: () => <Content />,
})
