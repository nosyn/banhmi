import { VERSION_METADATA } from './tokens'

/**
 * Decorator that pins a controller class or individual handler method to a
 * specific API version string.
 *
 * When applied to a **class**, every handler in that controller requires the
 * resolved request version to match. When applied to a **method**, only that
 * handler is version-gated; other handlers in the same controller are
 * unaffected unless they also carry `@Version`.
 *
 * Method-level `@Version` takes precedence over class-level `@Version`.
 *
 * @param version - The version string (e.g. `'1'`, `'2'`, `'beta'`).
 *
 * @example
 * // Pin every handler in this controller to version 1
 * \@Version('1')
 * \@Controller('cats')
 * class CatsV1Controller {}
 *
 * // Pin a single method to version 2
 * \@Controller('cats')
 * class CatsController {
 *   \@Version('2')
 *   \@Get()
 *   findAll() { return [] }
 * }
 */
export function Version(version: string) {
  return (
    _target: unknown,
    context: ClassDecoratorContext | ClassMethodDecoratorContext,
  ): void => {
    if (context.kind === 'class') {
      context.metadata[VERSION_METADATA] = version
    } else {
      // Store per-method versions in a sub-record keyed by method name
      const methodName = context.name as string
      const existing =
        (context.metadata[VERSION_METADATA] as
          | Record<string, string>
          | undefined) ?? {}
      context.metadata[VERSION_METADATA] = {
        ...existing,
        [methodName]: version,
      }
    }
  }
}
