import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/built-ins/interceptors.mdx'

export const Route = createFileRoute('/docs/built-ins/interceptors')({
  component: () => <Content />,
})
