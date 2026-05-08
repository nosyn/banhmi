import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/other-features.mdx'

export const Route = createFileRoute('/docs/graphql/other-features')({
  component: () => <Content />,
})
