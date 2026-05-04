// Bun 1.3.x implements TC39 Stage 3 decorators but does not expose Symbol.metadata
// as a global property on the Symbol object. Instead it stores class metadata under
// a well-known symbol that can be discovered from any decorated class.
//
// This polyfill captures that symbol and exposes it as Symbol.metadata so that
// tests and runtime code can access class metadata via the spec-compliant API.

if (
  typeof (Symbol as unknown as Record<string, unknown>).metadata === 'undefined'
) {
  // Use a probe class to capture the internal Symbol.metadata symbol that Bun uses
  function _probe() {
    return <T extends abstract new (...args: unknown[]) => unknown>(
      _target: T,
      context: ClassDecoratorContext<T>,
    ): void => {
      context.metadata._ = 1
    }
  }

  @_probe()
  class _Probe {}

  const metaSym = Object.getOwnPropertySymbols(_Probe).find(
    (s) => s.description === 'Symbol.metadata',
  )
  if (metaSym) {
    ;(Symbol as unknown as Record<string, unknown>).metadata = metaSym
  }
}
