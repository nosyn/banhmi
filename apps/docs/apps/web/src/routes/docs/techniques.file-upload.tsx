import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/file-upload.mdx'

export const Route = createFileRoute('/docs/techniques/file-upload')({
  component: () => <Content />,
})
