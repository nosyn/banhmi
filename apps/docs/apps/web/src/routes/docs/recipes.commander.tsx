import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/commander.mdx'

export const Route = createFileRoute('/docs/recipes/commander')({
  component: () => <Content />,
})
