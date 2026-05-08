import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/security/csrf.mdx'

export const Route = createFileRoute('/docs/security/csrf')({
  component: () => <Content />,
})
