import {
  HTTP_CODE_METADATA,
  REDIRECT_METADATA,
  RESPONSE_HEADERS_METADATA,
} from '../metadata-keys'

export function HttpCode(statusCode: number) {
  return function (_target: unknown, context: ClassMethodDecoratorContext): void {
    if (!context.metadata[HTTP_CODE_METADATA]) context.metadata[HTTP_CODE_METADATA] = {}
    ;(context.metadata[HTTP_CODE_METADATA] as Record<string, number>)[context.name as string] = statusCode
  }
}

export function Header(name: string, value: string) {
  return function (_target: unknown, context: ClassMethodDecoratorContext): void {
    if (!context.metadata[RESPONSE_HEADERS_METADATA]) context.metadata[RESPONSE_HEADERS_METADATA] = {}
    const headers = context.metadata[RESPONSE_HEADERS_METADATA] as Record<string, [string, string][]>
    if (!headers[context.name as string]) headers[context.name as string] = []
    headers[context.name as string]!.push([name, value])
  }
}

export function Redirect(url: string, statusCode = 302) {
  return function (_target: unknown, context: ClassMethodDecoratorContext): void {
    if (!context.metadata[REDIRECT_METADATA]) context.metadata[REDIRECT_METADATA] = {}
    ;(context.metadata[REDIRECT_METADATA] as Record<string, { url: string; statusCode: number }>)[
      context.name as string
    ] = { url, statusCode }
  }
}
