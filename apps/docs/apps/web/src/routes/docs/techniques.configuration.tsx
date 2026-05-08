import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/configuration.mdx'

export const Route = createFileRoute('/docs/techniques/configuration')({
  component: () => <Content />,
})
