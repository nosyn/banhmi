import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/deployment/https-and-multiple-servers.mdx'

export const Route = createFileRoute('/docs/deployment/https-and-multiple-servers')({
  component: () => <Content />,
})
