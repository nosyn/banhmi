import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/sharing-models.mdx'

export const Route = createFileRoute('/docs/graphql/sharing-models')({
  component: () => <Content />,
})
