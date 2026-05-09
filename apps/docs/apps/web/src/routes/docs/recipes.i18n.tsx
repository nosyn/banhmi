import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/i18n.mdx'

export const Route = createFileRoute('/docs/recipes/i18n')({
  component: () => <Content />,
})
