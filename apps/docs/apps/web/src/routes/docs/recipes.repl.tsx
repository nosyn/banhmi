import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/repl.mdx'

export const Route = createFileRoute('/docs/recipes/repl')({
  component: () => <Content />,
})
