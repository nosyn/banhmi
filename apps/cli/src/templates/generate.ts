function toPascalCase(name: string): string {
  return name
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

export function controllerTemplate(name: string): string {
  const className = `${toPascalCase(name)}Controller`
  return `import { Controller, Get } from 'banhmi'

@Controller('/${name}')
export class ${className} {
  @Get('/')
  findAll() {
    return []
  }
}
`
}

export function serviceTemplate(name: string): string {
  const className = `${toPascalCase(name)}Service`
  return `import { Injectable } from 'banhmi'

@Injectable()
export class ${className} {
}
`
}

export function moduleTemplate(name: string): string {
  const className = `${toPascalCase(name)}Module`
  const serviceClass = `${toPascalCase(name)}Service`
  const controllerClass = `${toPascalCase(name)}Controller`
  return `import { Module } from 'banhmi'
import { ${controllerClass} } from './${name}.controller'
import { ${serviceClass} } from './${name}.service'

@Module({
  controllers: [${controllerClass}],
  providers: [${serviceClass}],
})
export class ${className} {}
`
}

export function gatewayTemplate(name: string): string {
  const className = `${toPascalCase(name)}Gateway`
  return `import { WebSocketGateway, SubscribeMessage, WebSocketServer } from 'banhmi'
import type { Server } from 'bun'
import type { WsContext } from 'banhmi'

@WebSocketGateway({ path: '/${name}' })
export class ${className} {
  @WebSocketServer()
  server!: Server

  @SubscribeMessage('message')
  handleMessage(ctx: WsContext) {
    return { event: 'message', data: ctx.data }
  }
}
`
}
