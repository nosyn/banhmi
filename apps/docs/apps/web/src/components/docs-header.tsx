import { GithubLogo, MagnifyingGlass, Moon, Sun } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { SidebarTrigger } from '@workspace/ui/components/sidebar'
import { cn } from '@workspace/ui/lib/utils'
import { useCallback, useEffect, useState } from 'react'
import { SearchDialog } from './search-dialog'
import { useTheme } from './theme-provider'

export function DocsHeader() {
  const { theme, toggle } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)

  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-sm">
        {/* Sidebar trigger (mobile hamburger) */}
        <SidebarTrigger className="shrink-0 md:hidden" />

        {/* Logo + name */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 font-semibold text-foreground hover:opacity-80"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            B
          </span>
          <span className="hidden sm:inline">Banhmi</span>
        </Link>

        {/* Search button — expands on desktop */}
        <button
          type="button"
          onClick={openSearch}
          className={cn(
            'flex flex-1 items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted',
            'max-w-xs sm:max-w-sm lg:max-w-md',
          )}
        >
          <MagnifyingGlass className="size-3.5 shrink-0" />
          <span className="flex-1 text-left text-xs truncate">
            Search docs…
          </span>
          <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] sm:inline">
            ⌘K
          </kbd>
        </button>

        {/* Right actions */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* Version badge */}
          <span className="hidden rounded-full border border-border bg-muted px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline">
            v1.0.0-rc.1
          </span>

          {/* GitHub link */}
          <a
            href="https://github.com/nosyn/banhmi"
            target="_blank"
            rel="noreferrer"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="GitHub repository"
          >
            <GithubLogo className="size-4" />
          </a>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggle}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={
              theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            }
          >
            {theme === 'dark' ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </button>
        </div>
      </header>

      <SearchDialog open={searchOpen} onClose={closeSearch} />
    </>
  )
}
