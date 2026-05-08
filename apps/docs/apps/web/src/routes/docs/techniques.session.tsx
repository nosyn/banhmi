import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/session.mdx'

export const Route = createFileRoute('/docs/techniques/session')({
  component: () => <Content />,
})
