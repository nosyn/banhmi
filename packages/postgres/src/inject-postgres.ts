/**
 * Marker decorator for injecting the Postgres `Bun.SQL` instance.
 *
 * In practice, injection is driven by the static `inject` tuple — this
 * decorator is a no-op at runtime, but serves as readable documentation at
 * the call-site.
 *
 * @example
 * class UserService {
 *   static inject = [POSTGRES_SQL] as const
 *   constructor(@InjectSql() private readonly sql: Sql) {}
 * }
 */
export function InjectSql() {
  return (_target: unknown, _context: ClassFieldDecoratorContext): void => {}
}

export { POSTGRES_SQL as INJECT_POSTGRES_SQL } from './tokens'
