function buildMatcher(pattern) {
  const paramNames = []
  const regexSource = pattern
    .replace(/:([^/]+\?)/g, (_match, name) => {
      paramNames.push(name.slice(0, -1))
      return '([^/]*)'
    })
    .replace(/:([^/]+)/g, (_match, name) => {
      paramNames.push(name)
      return '([^/]+)'
    })
    .replace(/\*/g, '(?:.*)')
  const regex = new RegExp(`^${regexSource}$`)
  return (pathname) => {
    const match = pathname.match(regex)
    if (!match) return null
    const params = {}
    paramNames.forEach((name, i) => {
      params[name] = match[i + 1] ?? ''
    })
    return params
  }
}
export class RadixRouter {
  routes = []
  add(route) {
    this.routes.push({ ...route, matcher: buildMatcher(route.path) })
  }
  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== 'ALL' && route.method !== method) continue
      const params = route.matcher(pathname)
      if (params !== null) {
        const { path: _path, matcher: _matcher, ...rest } = route
        return { ...rest, params }
      }
    }
    return null
  }
}
