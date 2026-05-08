import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/security/rate-limiting.mdx'

export const Route = createFileRoute('/docs/security/rate-limiting')({
  component: () => <Content />,
})
