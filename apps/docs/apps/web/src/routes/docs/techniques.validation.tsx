import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/techniques/validation.mdx'

export const Route = createFileRoute('/docs/techniques/validation')({
  component: () => <Content />,
})
