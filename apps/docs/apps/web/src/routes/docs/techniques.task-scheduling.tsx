import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/task-scheduling.mdx'

export const Route = createFileRoute('/docs/techniques/task-scheduling')({
  component: () => <Content />,
})
