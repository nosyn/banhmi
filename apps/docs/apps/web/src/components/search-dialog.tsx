import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@workspace/ui/lib/utils'
import type { DocumentValue } from 'flexsearch'
import { Document as FlexDocument } from 'flexsearch'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import docRoutesRaw from '../content/doc-routes.json'

type DocItem = { slug: string; title: string }
type DocSection = { items: DocItem[]; slug: string; title: string }

const sections = (docRoutesRaw as { sections: DocSection[] }).sections

interface SearchEntry {
  id: string
  section: string
  title: string
  href: string
  [key: string]: DocumentValue | DocumentValue[]
}

function buildEntries(): SearchEntry[] {
  const entries: SearchEntry[] = []
  for (const section of sections) {
    const items =
      section.items.length > 0
        ? section.items
        : [{ slug: 'index', title: section.title }]
    for (const item of items) {
      entries.push({
        id: `${section.slug}/${item.slug}`,
        section: section.title,
        title: item.title,
        href: `/docs/${section.slug}/${item.slug}`,
      })
    }
  }
  return entries
}

type FlexDoc = FlexDocument<SearchEntry>

function buildIndex(entries: SearchEntry[]): FlexDoc {
  const index: FlexDoc = new FlexDocument<SearchEntry>({
    document: {
      id: 'id',
      index: ['title', 'section'],
      store: ['id', 'section', 'title', 'href'],
    },
  })
  for (const entry of entries) {
    index.add(entry)
  }
  return index
}

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

export function SearchDialog({ onClose, open }: SearchDialogProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchEntry[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const entries = useMemo(() => buildEntries(), [])
  const index = useMemo(() => buildIndex(entries), [entries])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setActiveIdx(0)
      return
    }
    // Search with enrich=true to get stored doc data back
    const raw = index.search(query, { limit: 10, enrich: true })
    const seen = new Set<string>()
    const found: SearchEntry[] = []
    for (const group of raw) {
      for (const r of group.result) {
        const id =
          typeof r === 'string' || typeof r === 'number'
            ? String(r)
            : (r as { id?: string }).id
        const doc: SearchEntry | undefined =
          typeof r === 'object' && 'doc' in r && r.doc
            ? (r.doc as SearchEntry)
            : entries.find((e) => e.id === id)
        if (doc && !seen.has(doc.id)) {
          seen.add(doc.id)
          found.push(doc)
        }
      }
    }
    setResults(found)
    setActiveIdx(0)
  }, [query, index, entries])

  const goTo = useCallback(
    (href: string) => {
      onClose()
      navigate({ to: href })
    },
    [navigate, onClose],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        const target = results[activeIdx]
        if (target) goTo(target.href)
      } else if (e.key === 'Escape') {
        onClose()
      }
    },
    [activeIdx, goTo, onClose, results],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* Dialog */}
      <div
        role="dialog"
        aria-label="Search documentation"
        aria-modal="true"
        className="relative mx-auto mt-[20vh] w-full max-w-xl rounded-xl border border-border bg-background shadow-2xl"
      >
        {/* Input row */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <MagnifyingGlass className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search docs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setQuery('')}
            >
              <X className="size-4" />
            </button>
          )}
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-2">
            {results.map((r, idx) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full flex-col items-start px-4 py-2.5 text-left text-sm transition-colors',
                    idx === activeIdx
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50',
                  )}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => goTo(r.href)}
                >
                  <span className="font-medium">{r.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.section}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {!query && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            Type to search {entries.length} doc pages
          </div>
        )}
      </div>
    </div>
  )
}
