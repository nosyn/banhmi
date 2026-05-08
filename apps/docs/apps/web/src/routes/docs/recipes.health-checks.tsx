import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/health-checks.mdx'

export const Route = createFileRoute('/docs/recipes/health-checks')({
  component: () => <Content />,
})
