import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/caching.mdx'

export const Route = createFileRoute('/docs/techniques/caching')({
  component: () => <Content />,
})
