import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/openapi/types-and-parameters.mdx'

export const Route = createFileRoute('/docs/openapi/types-and-parameters')({
  component: () => <Content />,
})
