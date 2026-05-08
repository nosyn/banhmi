import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/unions-and-enums.mdx'

export const Route = createFileRoute('/docs/graphql/unions-and-enums')({
  component: () => <Content />,
})
