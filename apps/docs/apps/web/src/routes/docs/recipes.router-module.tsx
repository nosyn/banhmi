import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/router-module.mdx'

export const Route = createFileRoute('/docs/recipes/router-module')({
  component: () => <Content />,
})
