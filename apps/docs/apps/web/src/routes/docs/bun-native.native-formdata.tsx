import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/bun-native/native-formdata.mdx'

export const Route = createFileRoute('/docs/bun-native/native-formdata')({
  component: () => <Content />,
})
