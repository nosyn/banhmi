import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/interfaces.mdx'

export const Route = createFileRoute('/docs/graphql/interfaces')({
  component: () => <Content />,
})
