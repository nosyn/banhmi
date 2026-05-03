export type Token<T> = symbol & { readonly __phantom_type__: T }

export function Token<T>(description: string): Token<T> {
  return Symbol(description) as Token<T>
}
