import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/built-ins/pipes.mdx'

export const Route = createFileRoute('/docs/built-ins/pipes')({
  component: () => <Content />,
})
