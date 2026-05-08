import { MDXProvider } from '@mdx-js/react'
import type { ReactNode } from 'react'
import { CodeFromExample } from './code-from-example'

const components = { CodeFromExample }

/**
 * Provides the set of MDX components available inside doc pages.
 * Wrap the docs route subtree in this provider.
 */
export function DocsMdxProvider({ children }: { children: ReactNode }) {
  return <MDXProvider components={components}>{children}</MDXProvider>
}
