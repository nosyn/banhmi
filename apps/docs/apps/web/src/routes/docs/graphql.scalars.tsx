import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/scalars.mdx'

export const Route = createFileRoute('/docs/graphql/scalars')({
  component: () => <Content />,
})
