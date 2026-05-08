import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/field-middleware.mdx'

export const Route = createFileRoute('/docs/graphql/field-middleware')({
  component: () => <Content />,
})
