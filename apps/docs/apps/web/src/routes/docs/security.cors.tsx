import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/security/cors.mdx'

export const Route = createFileRoute('/docs/security/cors')({
  component: () => <Content />,
})
