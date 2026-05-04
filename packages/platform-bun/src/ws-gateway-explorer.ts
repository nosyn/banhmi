import type {
  ClassConstructor,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsContext,
  WsGatewayMetadata,
} from '@banhmi/common'
import {
  WS_GATEWAY_METADATA,
  WS_MESSAGE_METADATA,
  WS_SERVER_PROPERTY_METADATA,
} from '@banhmi/common'

export interface ExploredGateway {
  path: string
  messages: Record<string, (ctx: WsContext) => unknown>
  lifecycle: {
    onInit?: (server: unknown) => void
    onConnection?: (ctx: WsContext) => void
    onDisconnect?: (ctx: WsContext) => void
  }
  serverPropNames: string[]
}

export class WsGatewayExplorer {
  explore(instance: object, gatewayClass: ClassConstructor): ExploredGateway | null {
    const classMeta = gatewayClass[Symbol.metadata] as Record<symbol, unknown> | null
    if (!classMeta) return null

    const gatewayMeta = classMeta[WS_GATEWAY_METADATA] as WsGatewayMetadata | undefined
    if (!gatewayMeta) return null

    const messageMap =
      (classMeta[WS_MESSAGE_METADATA] as Record<string, string> | undefined) ?? {}
    const serverPropNames =
      (classMeta[WS_SERVER_PROPERTY_METADATA] as string[] | undefined) ?? []

    const messages: Record<string, (ctx: WsContext) => unknown> = {}
    for (const [event, methodName] of Object.entries(messageMap)) {
      const fn = (instance as Record<string, unknown>)[methodName]
      if (typeof fn === 'function') {
        messages[event] = (ctx) =>
          (fn as (ctx: WsContext) => unknown).call(instance, ctx)
      }
    }

    const lifecycle: ExploredGateway['lifecycle'] = {}

    if (
      'afterInit' in instance &&
      typeof (instance as OnGatewayInit).afterInit === 'function'
    ) {
      lifecycle.onInit = (server) => (instance as OnGatewayInit).afterInit(server)
    }
    if (
      'handleConnection' in instance &&
      typeof (instance as OnGatewayConnection).handleConnection === 'function'
    ) {
      lifecycle.onConnection = (ctx) =>
        (instance as OnGatewayConnection).handleConnection(ctx)
    }
    if (
      'handleDisconnect' in instance &&
      typeof (instance as OnGatewayDisconnect).handleDisconnect === 'function'
    ) {
      lifecycle.onDisconnect = (ctx) =>
        (instance as OnGatewayDisconnect).handleDisconnect(ctx)
    }

    return { path: gatewayMeta.path, messages, lifecycle, serverPropNames }
  }
}
