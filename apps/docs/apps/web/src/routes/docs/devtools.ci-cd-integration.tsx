import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/devtools/ci-cd-integration.mdx'

export const Route = createFileRoute('/docs/devtools/ci-cd-integration')({
  component: () => <Content />,
})
