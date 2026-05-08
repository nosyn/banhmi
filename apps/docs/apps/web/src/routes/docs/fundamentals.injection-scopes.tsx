import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/fundamentals/injection-scopes.mdx'

export const Route = createFileRoute('/docs/fundamentals/injection-scopes')({
  component: () => <Content />,
})
