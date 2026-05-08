import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/fundamentals/module-reference.mdx'

export const Route = createFileRoute('/docs/fundamentals/module-reference')({
  component: () => <Content />,
})
