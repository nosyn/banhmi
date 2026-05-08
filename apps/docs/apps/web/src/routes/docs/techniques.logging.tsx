import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/logging.mdx'

export const Route = createFileRoute('/docs/techniques/logging')({
  component: () => <Content />,
})
