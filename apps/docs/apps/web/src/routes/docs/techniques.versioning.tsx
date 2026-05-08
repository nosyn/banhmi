import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/versioning.mdx'

export const Route = createFileRoute('/docs/techniques/versioning')({
  component: () => <Content />,
})
