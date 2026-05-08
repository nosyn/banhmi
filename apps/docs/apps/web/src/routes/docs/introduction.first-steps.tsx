import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/introduction/first-steps.mdx'

export const Route = createFileRoute('/docs/introduction/first-steps')({
  component: () => <Content />,
})
