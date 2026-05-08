import { useEffect, useState } from 'react'

/**
 * Returns the canonical path to a feature example, used for diagnostic display.
 *
 * @example
 * resolveExamplePath('middleware-fn') // → '/examples/features/middleware-fn/index.ts'
 */
export const resolveExamplePath = (slug: string): string =>
  `/examples/features/${slug}/index.ts`

// Vite glob walks up six segments to reach the repo-root examples directory.
// File path: apps/docs/apps/web/src/components/code-from-example.tsx
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
const examples: Record<string, () => Promise<string>> =
  typeof import.meta.glob === 'function'
    ? (import.meta.glob('../../../../../../examples/features/*/index.ts', {
        import: 'default',
        query: '?raw',
      }) as Record<string, () => Promise<string>>)
    : {}

type Props = { slug: string; lang?: string }

/**
 * Renders the contents of `examples/features/<slug>/index.ts` as a code block.
 * Examples are the single source of truth for documentation snippets.
 *
 * @example
 * <CodeFromExample slug="middleware-fn" />
 */
export function CodeFromExample({ lang = 'ts', slug }: Props) {
  const [code, setCode] = useState<string | null>(null)
  useEffect(() => {
    const key = Object.keys(examples).find((k) => k.endsWith(`/${slug}/index.ts`))
    if (!key) {
      setCode(`// example "${slug}" not found`)
      return
    }
    examples[key]().then(setCode)
  }, [slug])
  if (code === null) return <pre>loading…</pre>
  return (
    <pre data-lang={lang}>
      <code>{code}</code>
    </pre>
  )
}
