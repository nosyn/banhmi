import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/suites.mdx'

export const Route = createFileRoute('/docs/recipes/suites')({
  component: () => <Content />,
})
