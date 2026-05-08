import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/built-ins/exceptions.mdx'

export const Route = createFileRoute('/docs/built-ins/exceptions')({
  component: () => <Content />,
})
