import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/deployment/raw-body.mdx'

export const Route = createFileRoute('/docs/deployment/raw-body')({
  component: () => <Content />,
})
