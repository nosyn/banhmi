import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/graphql/generating-sdl.mdx'

export const Route = createFileRoute('/docs/graphql/generating-sdl')({
  component: () => <Content />,
})
