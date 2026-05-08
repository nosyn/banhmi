import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/bun-native/native-websocket.mdx'

export const Route = createFileRoute('/docs/bun-native/native-websocket')({
  component: () => <Content />,
})
