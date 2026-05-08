import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/sentry.mdx'

export const Route = createFileRoute('/docs/recipes/sentry')({
  component: () => <Content />,
})
