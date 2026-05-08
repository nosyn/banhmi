/**
 * Parameter decorator that marks a constructor argument as injected from the
 * `DRIZZLE_DB` token.
 *
 * In practice, injection is driven by the static `inject` tuple — this
 * decorator is a no-op at runtime but serves as readable documentation at
 * the call-site.
 *
 * @example
 * class CatService {
 *   static inject = [DRIZZLE_DB] as const
 *   constructor(@InjectDb() private readonly db: BunSQLiteDatabase) {}
 * }
 */
export function InjectDb() {
  return (_target: unknown, _context: ClassFieldDecoratorContext): void => {}
}

export { DRIZZLE_DB as INJECT_DRIZZLE_DB } from './tokens'
