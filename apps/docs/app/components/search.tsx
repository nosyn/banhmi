import { useEffect, useRef, useState } from 'react'

interface PagefindResult {
  url: string
  meta: { title: string }
  excerpt: string
}

export function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PagefindResult[]>([])
  const pagefind = useRef<{
    search: (
      q: string,
    ) => Promise<{ results: Array<{ data: () => Promise<PagefindResult> }> }>
  } | null>(null)
  const generationRef = useRef(0)

  useEffect(() => {
    // Pagefind is available only after build — gracefully ignore in dev
    import('/pagefind/pagefind.js' as unknown as string)
      .then((pf) => {
        pagefind.current = pf as typeof pagefind.current
      })
      .catch(() => {})
  }, [])

  async function handleSearch(q: string) {
    setQuery(q)
    const generation = ++generationRef.current
    if (!pagefind.current || !q) {
      setResults([])
      return
    }
    try {
      const { results: rawResults } = await pagefind.current.search(q)
      if (generation !== generationRef.current) return
      const data = await Promise.all(
        rawResults.slice(0, 5).map((r) => r.data()),
      )
      if (generation !== generationRef.current) return
      setResults(data)
    } catch {
      setResults([])
    }
  }

  return (
    <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
      <input
        type="search"
        placeholder="Search docs..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          fontSize: '0.9rem',
          boxSizing: 'border-box' as const,
        }}
      />
      {results.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            listStyle: 'none',
            margin: 0,
            padding: '0.5rem 0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 100,
          }}
        >
          {results.map((r) => (
            <li key={r.url}>
              <a
                href={r.url}
                style={{
                  display: 'block',
                  padding: '0.5rem 1rem',
                  textDecoration: 'none',
                  color: '#111',
                }}
              >
                <div style={{ fontWeight: 600 }}>{r.meta.title}</div>
                <div
                  style={{ fontSize: '0.8rem', color: '#6b7280' }}
                  dangerouslySetInnerHTML={{ __html: r.excerpt }}
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
