/**
 * Symbol-keyed metadata constants for OpenAPI decorators.
 * All keys are private to the @banhmi/openapi package.
 * @internal
 */
export const API_TAGS_METADATA = Symbol('openapi:tags')
export const API_OPERATION_METADATA = Symbol('openapi:operation')
export const API_PARAMS_METADATA = Symbol('openapi:params')
export const API_QUERY_METADATA = Symbol('openapi:query')
export const API_BODY_METADATA = Symbol('openapi:body')
export const API_RESPONSES_METADATA = Symbol('openapi:responses')
export const API_SECURITY_METADATA = Symbol('openapi:security')
export const API_EXCLUDE_ENDPOINT_METADATA = Symbol('openapi:exclude')
export const API_EXTRA_MODELS_METADATA = Symbol('openapi:extra-models')
export const API_HIDE_PROPERTY_METADATA = Symbol('openapi:hide-property')
export const API_PROPERTY_METADATA = Symbol('openapi:property')

/**
 * A class constructor type compatible with Biome's noBannedTypes rule.
 * Used in place of the banned `Function` type for class references.
 * @internal
 */
export type ModelClass = new (...args: unknown[]) => unknown

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Options for {@link ApiOperation}.
 */
export interface ApiOperationOptions {
  /** Short human-readable summary of the operation. */
  summary?: string
  /** Longer description of the operation (Markdown supported). */
  description?: string
  /** Mark the operation as deprecated. */
  deprecated?: boolean
}

/**
 * Options for {@link ApiParam}.
 */
export interface ApiParamOptions {
  /** The name of the path parameter. */
  name: string
  /** Parameter type (e.g. `'string'`, `'number'`). */
  type?: string
  /** Human-readable description. */
  description?: string
  /** Whether the parameter is required (path params are always required). */
  required?: boolean
}

/**
 * Options for {@link ApiQuery}.
 */
export interface ApiQueryOptions {
  /** The name of the query parameter. */
  name: string
  /** Parameter type. */
  type?: string
  /** Human-readable description. */
  description?: string
  /** Whether the parameter is required. */
  required?: boolean
}

/**
 * Options for {@link ApiBody}.
 */
export interface ApiBodyOptions {
  /** Class or schema describing the request body. */
  type?: ModelClass | string
  /** Human-readable description. */
  description?: string
  /** Whether the request body is required. */
  required?: boolean
}

/**
 * Options for {@link ApiResponse}.
 */
export interface ApiResponseOptions {
  /** HTTP status code (e.g. `200`, `404`). */
  status: number
  /** Human-readable description of the response. */
  description?: string
  /** Class or primitive type for the response body. */
  type?: ModelClass | string | Array<ModelClass | string>
  /** Raw OpenAPI schema for the response. */
  schema?: Record<string, unknown>
}

/**
 * Options for {@link ApiProperty}.
 */
export interface ApiPropertyOptions {
  /** TypeScript / OpenAPI type. */
  type?: string | ModelClass | string[]
  /** Human-readable description. */
  description?: string
  /** Example value shown in the UI. */
  example?: unknown
  /** Whether the property is required (default: `true`). */
  required?: boolean
  /** Enumeration values. */
  enum?: string[] | number[]
  /** OpenAPI format (e.g. `'int32'`, `'date-time'`). */
  format?: string
}

// ---------------------------------------------------------------------------
// Class / method decorators
// ---------------------------------------------------------------------------

/**
 * Tag a controller with one or more OpenAPI tags. Tags are used to group
 * operations in the rendered documentation.
 *
 * @param names - One or more tag names.
 *
 * @example
 * \@ApiTags('cats', 'animals')
 * \@Controller('/cats')
 * export class CatsController {}
 */
export function ApiTags(
  ...names: string[]
): (target: unknown, context: ClassDecoratorContext) => void {
  return (_target, context) => {
    context.metadata[API_TAGS_METADATA] = names
  }
}

/**
 * Describe a single route handler operation.
 *
 * @param opts - Summary, description, and deprecation flag.
 *
 * @example
 * \@ApiOperation({ summary: 'List all cats', deprecated: false })
 * \@Get()
 * findAll() {}
 */
export function ApiOperation(
  opts: ApiOperationOptions,
): (target: unknown, context: ClassMethodDecoratorContext) => void {
  return (_target, context) => {
    const existing =
      (context.metadata[API_OPERATION_METADATA] as Record<
        string,
        ApiOperationOptions
      >) ?? {}
    existing[context.name as string] = opts
    context.metadata[API_OPERATION_METADATA] = existing
  }
}

/**
 * Describe a path parameter for a route handler.
 *
 * @param opts - Parameter name, type, description, required flag.
 *
 * @example
 * \@ApiParam({ name: 'id', type: 'string', description: 'Cat ID', required: true })
 * \@Get('/:id')
 * findOne() {}
 */
export function ApiParam(
  opts: ApiParamOptions,
): (target: unknown, context: ClassMethodDecoratorContext) => void {
  return (_target, context) => {
    const existing =
      (context.metadata[API_PARAMS_METADATA] as Record<
        string,
        ApiParamOptions[]
      >) ?? {}
    const key = context.name as string
    existing[key] = [...(existing[key] ?? []), opts]
    context.metadata[API_PARAMS_METADATA] = existing
  }
}

/**
 * Describe a query parameter for a route handler.
 *
 * @param opts - Parameter name, type, description, required flag.
 *
 * @example
 * \@ApiQuery({ name: 'limit', type: 'number', required: false })
 * \@Get()
 * findAll() {}
 */
export function ApiQuery(
  opts: ApiQueryOptions,
): (target: unknown, context: ClassMethodDecoratorContext) => void {
  return (_target, context) => {
    const existing =
      (context.metadata[API_QUERY_METADATA] as Record<
        string,
        ApiQueryOptions[]
      >) ?? {}
    const key = context.name as string
    existing[key] = [...(existing[key] ?? []), opts]
    context.metadata[API_QUERY_METADATA] = existing
  }
}

/**
 * Describe the request body for a route handler.
 *
 * @param opts - Type, description, and required flag.
 *
 * @example
 * \@ApiBody({ type: CreateCatDto, description: 'Cat data', required: true })
 * \@Post()
 * create() {}
 */
export function ApiBody(
  opts: ApiBodyOptions,
): (target: unknown, context: ClassMethodDecoratorContext) => void {
  return (_target, context) => {
    const existing =
      (context.metadata[API_BODY_METADATA] as Record<string, ApiBodyOptions>) ??
      {}
    existing[context.name as string] = opts
    context.metadata[API_BODY_METADATA] = existing
  }
}

/**
 * Describe a possible response for a route handler.
 *
 * Multiple `@ApiResponse` decorators can be stacked on a single handler.
 *
 * @param opts - Status code, description, type, and optional raw schema.
 *
 * @example
 * \@ApiResponse({ status: 200, description: 'Cat found', type: Cat })
 * \@ApiResponse({ status: 404, description: 'Cat not found' })
 * \@Get('/:id')
 * findOne() {}
 */
export function ApiResponse(
  opts: ApiResponseOptions,
): (target: unknown, context: ClassMethodDecoratorContext) => void {
  return (_target, context) => {
    const existing =
      (context.metadata[API_RESPONSES_METADATA] as Record<
        string,
        ApiResponseOptions[]
      >) ?? {}
    const key = context.name as string
    existing[key] = [...(existing[key] ?? []), opts]
    context.metadata[API_RESPONSES_METADATA] = existing
  }
}

// ---------------------------------------------------------------------------
// Security decorators
// ---------------------------------------------------------------------------

/**
 * Require Bearer token authentication for the decorated controller or handler.
 *
 * @param name - Security scheme name defined in `DocumentBuilder.addBearerAuth(name)` (default: `'bearerAuth'`).
 *
 * @example
 * \@ApiBearerAuth()
 * \@Controller('/admin')
 * export class AdminController {}
 */
export function ApiBearerAuth(
  name = 'bearerAuth',
): (
  target: unknown,
  context: ClassDecoratorContext | ClassMethodDecoratorContext,
) => void {
  return (_target, context) => {
    const existing =
      (context.metadata[API_SECURITY_METADATA] as Array<
        Record<string, string[]>
      >) ?? []
    context.metadata[API_SECURITY_METADATA] = [...existing, { [name]: [] }]
  }
}

/**
 * Require cookie-based authentication for the decorated controller or handler.
 *
 * @param name - Security scheme name (default: `'cookieAuth'`).
 *
 * @example
 * \@ApiCookieAuth()
 * \@Controller('/profile')
 * export class ProfileController {}
 */
export function ApiCookieAuth(
  name = 'cookieAuth',
): (
  target: unknown,
  context: ClassDecoratorContext | ClassMethodDecoratorContext,
) => void {
  return (_target, context) => {
    const existing =
      (context.metadata[API_SECURITY_METADATA] as Array<
        Record<string, string[]>
      >) ?? []
    context.metadata[API_SECURITY_METADATA] = [...existing, { [name]: [] }]
  }
}

/**
 * Apply an arbitrary named security scheme to the decorated controller or handler.
 *
 * @param name - Security scheme name as defined in the OpenAPI `components.securitySchemes`.
 *
 * @example
 * \@ApiSecurity('my-oauth2')
 * \@Get('/secure')
 * secureRoute() {}
 */
export function ApiSecurity(
  name: string,
): (
  target: unknown,
  context: ClassDecoratorContext | ClassMethodDecoratorContext,
) => void {
  return (_target, context) => {
    const existing =
      (context.metadata[API_SECURITY_METADATA] as Array<
        Record<string, string[]>
      >) ?? []
    context.metadata[API_SECURITY_METADATA] = [...existing, { [name]: [] }]
  }
}

// ---------------------------------------------------------------------------
// Endpoint control decorators
// ---------------------------------------------------------------------------

/**
 * Exclude the decorated route handler from the generated OpenAPI document.
 *
 * @example
 * \@ApiExcludeEndpoint()
 * \@Get('/internal')
 * internal() {}
 */
export function ApiExcludeEndpoint(): (
  target: unknown,
  context: ClassMethodDecoratorContext,
) => void {
  return (_target, context) => {
    const existing =
      (context.metadata[API_EXCLUDE_ENDPOINT_METADATA] as Set<string>) ??
      new Set<string>()
    existing.add(context.name as string)
    context.metadata[API_EXCLUDE_ENDPOINT_METADATA] = existing
  }
}

/**
 * Register additional model classes with the OpenAPI document so they appear
 * in `components/schemas` even if not directly referenced.
 *
 * @param classes - One or more class constructors to register.
 *
 * @example
 * \@ApiExtraModels(PaginationDto)
 * \@Controller('/cats')
 * export class CatsController {}
 */
export function ApiExtraModels(
  ...classes: ModelClass[]
): (target: unknown, context: ClassDecoratorContext) => void {
  return (_target, context) => {
    const existing =
      (context.metadata[API_EXTRA_MODELS_METADATA] as ModelClass[]) ?? []
    context.metadata[API_EXTRA_MODELS_METADATA] = [...existing, ...classes]
  }
}

// ---------------------------------------------------------------------------
// Property decorators
// ---------------------------------------------------------------------------

/**
 * Exclude this property from the generated OpenAPI schema.
 *
 * @example
 * class Cat {
 *   \@ApiHideProperty()
 *   internalId: number
 * }
 */
export function ApiHideProperty(): (
  target: undefined,
  context: ClassFieldDecoratorContext,
) => void {
  return (_target, context) => {
    const existing =
      (context.metadata[API_HIDE_PROPERTY_METADATA] as Set<string>) ??
      new Set<string>()
    existing.add(context.name as string)
    context.metadata[API_HIDE_PROPERTY_METADATA] = existing
  }
}

/**
 * Document a class property for inclusion in the OpenAPI schema.
 *
 * @param opts - Type, description, example, required flag, enum values, and format.
 *
 * @example
 * class Cat {
 *   \@ApiProperty({ type: 'string', example: 'Whiskers', description: 'Cat name' })
 *   name: string
 *
 *   \@ApiProperty({ type: 'number', required: false })
 *   age?: number
 * }
 */
export function ApiProperty(
  opts: ApiPropertyOptions = {},
): (target: undefined, context: ClassFieldDecoratorContext) => void {
  return (_target, context) => {
    const existing =
      (context.metadata[API_PROPERTY_METADATA] as Record<
        string,
        ApiPropertyOptions
      >) ?? {}
    existing[context.name as string] = opts
    context.metadata[API_PROPERTY_METADATA] = existing
  }
}
