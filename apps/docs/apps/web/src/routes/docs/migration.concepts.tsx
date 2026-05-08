import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/migration/concepts.mdx'

export const Route = createFileRoute('/docs/migration/concepts')({
  component: () => <Content />,
})
