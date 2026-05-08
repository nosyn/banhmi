import {
  HTTP_CODE_METADATA,
  REDIRECT_METADATA,
  RESPONSE_HEADERS_METADATA,
} from '../metadata-keys'
export function HttpCode(statusCode) {
  return (_target, context) => {
    if (!context.metadata[HTTP_CODE_METADATA])
      context.metadata[HTTP_CODE_METADATA] = {}
    context.metadata[HTTP_CODE_METADATA][context.name] = statusCode
  }
}
export function Header(name, value) {
  return (_target, context) => {
    if (!context.metadata[RESPONSE_HEADERS_METADATA])
      context.metadata[RESPONSE_HEADERS_METADATA] = {}
    const headers = context.metadata[RESPONSE_HEADERS_METADATA]
    if (!headers[context.name]) headers[context.name] = []
    headers[context.name]?.push([name, value])
  }
}
export function Redirect(url, statusCode = 302) {
  return (_target, context) => {
    if (!context.metadata[REDIRECT_METADATA])
      context.metadata[REDIRECT_METADATA] = {}
    context.metadata[REDIRECT_METADATA][context.name] = { url, statusCode }
  }
}
