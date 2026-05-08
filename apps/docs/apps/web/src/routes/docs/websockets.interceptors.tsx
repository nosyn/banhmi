import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/websockets/interceptors.mdx'

export const Route = createFileRoute('/docs/websockets/interceptors')({
  component: () => <Content />,
})
