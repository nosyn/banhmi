import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/overview/custom-decorators.mdx'

export const Route = createFileRoute('/docs/overview/custom-decorators')({
  component: () => <Content />,
})
