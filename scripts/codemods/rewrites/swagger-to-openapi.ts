/**
 * Rewrites `@nestjs/swagger` import paths to `@banhmi/openapi`.
 *
 * Most decorator names are identical between the two packages; only the
 * import path needs updating. The import rewrite in `imports.ts` already
 * covers `@nestjs/swagger` → `@banhmi/openapi`, so this module handles
 * decorator renames that differ between the two packages.
 *
 * @example
 * ```ts
 * import { ApiModelProperty } from '@nestjs/swagger'
 * // → import { ApiProperty } from '@banhmi/openapi'
 * ```
 */

/**
 * Deprecated NestJS swagger decorator names mapped to their current equivalents.
 * Note: most names are identical; only legacy aliases are remapped here.
 */
const DECORATOR_RENAMES: Record<string, string> = {
  ApiModelProperty: 'ApiProperty',
  ApiModelPropertyOptional: 'ApiPropertyOptional',
  ApiImplicitBody: 'ApiBody',
  ApiImplicitParam: 'ApiParam',
  ApiImplicitQuery: 'ApiQuery',
  ApiImplicitHeader: 'ApiHeader',
  ApiImplicitHeaders: 'ApiHeaders',
  ApiImplicitFile: 'ApiFile',
  ApiUseTags: 'ApiTags',
}

/**
 * Rewrites deprecated `@nestjs/swagger` decorator names to their current
 * `@banhmi/openapi` equivalents.
 *
 * This rewrite should run _after_ `rewriteImports` has already changed
 * `@nestjs/swagger` to `@banhmi/openapi` in the import path.
 *
 * @param source - TypeScript source text
 * @returns Rewritten source text
 *
 * @example
 * ```ts
 * rewriteSwaggerToOpenapi(
 *   `import { ApiModelProperty } from '@banhmi/openapi'\n@ApiModelProperty() foo: string`
 * )
 * // → `import { ApiProperty } from '@banhmi/openapi'\n@ApiProperty() foo: string`
 * ```
 */
export function rewriteSwaggerToOpenapi(source: string): string {
  let out = source
  for (const [oldName, newName] of Object.entries(DECORATOR_RENAMES)) {
    const re = new RegExp(`\\b${oldName}\\b`, 'g')
    out = out.replace(re, newName)
  }
  return out
}
