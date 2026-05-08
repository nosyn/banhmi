import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/security/helmet.mdx'

export const Route = createFileRoute('/docs/security/helmet')({
  component: () => <Content />,
})
