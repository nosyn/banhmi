import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/streaming-files.mdx'

export const Route = createFileRoute('/docs/techniques/streaming-files')({
  component: () => <Content />,
})
