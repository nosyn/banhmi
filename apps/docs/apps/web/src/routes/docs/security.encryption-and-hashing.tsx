import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/security/encryption-and-hashing.mdx'

export const Route = createFileRoute('/docs/security/encryption-and-hashing')({
  component: () => <Content />,
})
