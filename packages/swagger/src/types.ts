export interface OpenApiInfo {
  title: string
  version: string
  description?: string
}

export interface OpenApiServer {
  url: string
  description?: string
}

export interface OpenApiSecurityScheme {
  type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect'
  scheme?: string
  bearerFormat?: string
  name?: string
  in?: string
}

export interface OpenApiComponents {
  securitySchemes?: Record<string, OpenApiSecurityScheme>
  schemas?: Record<string, unknown>
}

export interface OpenApiDocument {
  openapi: '3.1.0'
  info: OpenApiInfo
  servers?: OpenApiServer[]
  paths: Record<string, unknown>
  components?: OpenApiComponents
}
