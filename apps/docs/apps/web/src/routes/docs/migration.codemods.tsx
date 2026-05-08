import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/migration/codemods.mdx'

export const Route = createFileRoute('/docs/migration/codemods')({
  component: () => <Content />,
})
