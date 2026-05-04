import { createFileRoute } from '@tanstack/react-router'
import IndexMdx from '../docs/index.mdx'

export const Route = createFileRoute('/')({
  component: () => <IndexMdx />,
})
