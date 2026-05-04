import { Link } from '@tanstack/react-router'
import { Search } from './search'

const NAV = [
  { label: 'Overview', href: '/' },
  { label: 'Getting Started', href: '/docs/getting-started' },
  {
    label: 'API Reference',
    children: [
      { label: '@Controller', href: '/docs/api/controller' },
      { label: 'WebSockets', href: '/docs/api/websockets' },
      { label: '@banhmi/sqlite', href: '/docs/api/sqlite' },
      { label: '@banhmi/config', href: '/docs/api/config' },
      { label: '@banhmi/jwt', href: '/docs/api/jwt' },
      { label: '@banhmi/swagger', href: '/docs/api/swagger' },
    ],
  },
]

export function Sidebar() {
  return (
    <nav
      style={{
        width: '240px',
        flexShrink: 0,
        padding: '1.5rem 1rem',
        borderRight: '1px solid #e5e7eb',
        fontSize: '0.9rem',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.5rem' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          Banhmi
        </Link>
      </div>
      <Search />
      {NAV.map((item) => {
        if ('children' in item) {
          return (
            <div key={item.label} style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>
                {item.label}
              </div>
              {item.children.map((child) => (
                <Link
                  key={child.href}
                  to={child.href as string}
                  style={{ display: 'block', padding: '0.2rem 0.5rem', textDecoration: 'none', color: '#374151' }}
                  activeProps={{ style: { color: '#7c3aed', fontWeight: 600 } }}
                >
                  {child.label}
                </Link>
              ))}
            </div>
          )
        }
        return (
          <Link
            key={item.href}
            to={item.href as string}
            style={{ display: 'block', padding: '0.2rem 0', textDecoration: 'none', color: '#374151' }}
            activeProps={{ style: { color: '#7c3aed', fontWeight: 600 } }}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
