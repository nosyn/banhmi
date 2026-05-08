import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/recipes/passport.mdx'

export const Route = createFileRoute('/docs/recipes/passport')({
  component: () => <Content />,
})
