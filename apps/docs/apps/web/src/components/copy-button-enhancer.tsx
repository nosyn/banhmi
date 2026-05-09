import { useEffect } from 'react'

/**
 * Client-side enhancer that injects a copy-to-clipboard button on every
 * fenced code block inside `.prose article`.
 *
 * Uses a MutationObserver so newly rendered code blocks (after route
 * transitions) are automatically enhanced without re-mounting the component.
 */
export function CopyButtonEnhancer() {
  useEffect(() => {
    const enhance = () => {
      const pres =
        document.querySelectorAll<HTMLPreElement>('article.prose pre')
      for (const pre of pres) {
        if (pre.dataset.copyEnhanced) continue
        pre.dataset.copyEnhanced = 'true'

        const button = document.createElement('button')
        button.type = 'button'
        button.setAttribute('aria-label', 'Copy code')
        button.className =
          'copy-code-btn absolute right-2 top-2 rounded-md border border-border bg-background/80 p-1.5 text-xs text-muted-foreground opacity-0 transition-opacity hover:bg-background focus:opacity-100'
        button.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
        button.addEventListener('click', async () => {
          const code = pre.querySelector('code')?.innerText ?? pre.innerText
          try {
            await navigator.clipboard.writeText(code)
            button.setAttribute('data-copied', 'true')
            setTimeout(() => button.removeAttribute('data-copied'), 1500)
          } catch {
            // Clipboard API may be unavailable in some environments; silently skip.
          }
        })

        pre.classList.add('group', 'relative')
        pre.appendChild(button)
      }
    }

    enhance()

    const observer = new MutationObserver(enhance)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  return null
}
