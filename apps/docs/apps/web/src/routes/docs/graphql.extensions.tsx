import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/extensions.mdx'

export const Route = createFileRoute('/docs/graphql/extensions')({
  component: () => <Content />,
})
