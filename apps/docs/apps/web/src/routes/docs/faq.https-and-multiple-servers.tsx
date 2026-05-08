import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/faq/https-and-multiple-servers.mdx'

export const Route = createFileRoute('/docs/faq/https-and-multiple-servers')({
  component: () => <Content />,
})
