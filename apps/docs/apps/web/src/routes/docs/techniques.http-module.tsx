import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/http-module.mdx'

export const Route = createFileRoute('/docs/techniques/http-module')({
  component: () => <Content />,
})
