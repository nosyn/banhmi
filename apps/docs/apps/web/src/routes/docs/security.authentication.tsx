import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/security/authentication.mdx'

export const Route = createFileRoute('/docs/security/authentication')({
  component: () => <Content />,
})
