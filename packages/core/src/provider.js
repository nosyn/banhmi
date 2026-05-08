export function isValueProvider(def) {
  return typeof def === 'object' && 'useValue' in def
}
export function isFactoryProvider(def) {
  return typeof def === 'object' && 'useFactory' in def
}
export function isClassProvider(def) {
  return typeof def === 'function'
}
export function getProviderToken(def) {
  if (isClassProvider(def)) return def
  return def.provide
}
export function getInjectTokens(def) {
  if (isClassProvider(def)) {
    return def.inject ?? []
  }
  if (isFactoryProvider(def)) {
    return def.inject ?? []
  }
  return []
}
