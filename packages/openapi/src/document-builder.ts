import type { OpenApiDocument, OpenApiSecurityScheme } from './types'

export class DocumentBuilder {
  private title = ''
  private version = ''
  private description?: string
  private servers: Array<{ url: string; description?: string }> = []
  private securitySchemes: Record<string, OpenApiSecurityScheme> = {}

  setTitle(title: string): this {
    this.title = title
    return this
  }

  setVersion(version: string): this {
    this.version = version
    return this
  }

  setDescription(description: string): this {
    this.description = description
    return this
  }

  addServer(url: string, description?: string): this {
    this.servers.push({ url, description })
    return this
  }

  addBearerAuth(name = 'bearerAuth'): this {
    this.securitySchemes[name] = {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    }
    return this
  }

  addApiKey(name = 'apiKey', headerName = 'X-API-Key'): this {
    this.securitySchemes[name] = {
      type: 'apiKey',
      name: headerName,
      in: 'header',
    }
    return this
  }

  build(): OpenApiDocument {
    const doc: OpenApiDocument = {
      openapi: '3.1.0',
      info: {
        title: this.title,
        version: this.version,
        ...(this.description ? { description: this.description } : {}),
      },
      paths: {},
    }

    if (this.servers.length > 0) doc.servers = this.servers
    if (Object.keys(this.securitySchemes).length > 0) {
      doc.components = { securitySchemes: this.securitySchemes }
    }

    return doc
  }
}
