import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/database.mdx'

export const Route = createFileRoute('/docs/techniques/database')({
  component: () => <Content />,
})
