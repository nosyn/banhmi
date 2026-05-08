import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/serialization.mdx'

export const Route = createFileRoute('/docs/techniques/serialization')({
  component: () => <Content />,
})
