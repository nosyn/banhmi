/**
 * Marker decorator for injecting the MySQL `Bun.SQL` instance.
 *
 * In practice, injection is driven by the static `inject` tuple — this
 * decorator is a no-op at runtime but serves as readable documentation at
 * the call-site.
 *
 * @example
 * class ProductService {
 *   static inject = [MYSQL_SQL] as const
 *   constructor(@InjectMysql() private readonly sql: Sql) {}
 * }
 */
export function InjectMysql() {
  return (_target: unknown, _context: ClassFieldDecoratorContext): void => {}
}

export { MYSQL_SQL as INJECT_MYSQL_SQL } from './tokens'
