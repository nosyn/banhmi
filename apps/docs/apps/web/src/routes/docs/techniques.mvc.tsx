import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/mvc.mdx'

export const Route = createFileRoute('/docs/techniques/mvc')({
  component: () => <Content />,
})
