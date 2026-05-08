import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/migration/compat.mdx'

export const Route = createFileRoute('/docs/migration/compat')({
  component: () => <Content />,
})
