import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/cookies.mdx'

export const Route = createFileRoute('/docs/techniques/cookies')({
  component: () => <Content />,
})
