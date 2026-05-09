import { MDXProvider } from '@mdx-js/react'
import type { ReactNode } from 'react'
import { CodeFromExample } from './code-from-example'

/** Slugify a heading text for use as an anchor id */
function slugify(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
}

function getTextContent(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(getTextContent).join('')
  return ''
}

function HeadingWithAnchor({
  level,
  children,
}: {
  level: 1 | 2 | 3 | 4
  children: ReactNode
}) {
  const text = getTextContent(children)
  const id = slugify(text)
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4'

  return (
    <Tag id={id} className="group scroll-mt-20">
      {children}
      <a
        href={`#${id}`}
        className="ml-2 opacity-0 transition-opacity group-hover:opacity-60 text-muted-foreground no-underline"
        aria-label={`Link to ${text}`}
      >
        #
      </a>
    </Tag>
  )
}

const mdxComponents = {
  CodeFromExample,
  h1: (props: { children?: ReactNode }) => (
    <HeadingWithAnchor level={1}>{props.children}</HeadingWithAnchor>
  ),
  h2: (props: { children?: ReactNode }) => (
    <HeadingWithAnchor level={2}>{props.children}</HeadingWithAnchor>
  ),
  h3: (props: { children?: ReactNode }) => (
    <HeadingWithAnchor level={3}>{props.children}</HeadingWithAnchor>
  ),
  h4: (props: { children?: ReactNode }) => (
    <HeadingWithAnchor level={4}>{props.children}</HeadingWithAnchor>
  ),
}

/**
 * Provides MDX component overrides (headings with anchors, CodeFromExample, etc.)
 * for doc pages. Does NOT add prose wrapper — that lives in DocPageLayout.
 */
export function DocsMdxProvider({ children }: { children: ReactNode }) {
  return <MDXProvider components={mdxComponents}>{children}</MDXProvider>
}

/**
 * Prose wrapper used by doc routes to style MDX content.
 * Wrap individual route content in this.
 */
export function DocPageLayout({ children }: { children: ReactNode }) {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-4xl px-6 py-10 lg:px-12 lg:py-12 prose-headings:font-semibold prose-a:text-primary prose-code:before:content-none prose-code:after:content-none">
      {children}
    </article>
  )
}
