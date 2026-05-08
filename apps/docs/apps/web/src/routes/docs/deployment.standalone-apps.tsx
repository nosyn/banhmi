import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/deployment/standalone-apps.mdx'

export const Route = createFileRoute('/docs/deployment/standalone-apps')({
  component: () => <Content />,
})
