import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/mongo.mdx'

export const Route = createFileRoute('/docs/techniques/mongo')({
  component: () => <Content />,
})
