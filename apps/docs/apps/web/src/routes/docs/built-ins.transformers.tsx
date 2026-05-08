import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/built-ins/transformers.mdx'

export const Route = createFileRoute('/docs/built-ins/transformers')({
  component: () => <Content />,
})
