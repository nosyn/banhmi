import {
  WS_GATEWAY_METADATA,
  WS_MESSAGE_METADATA,
  WS_SERVER_PROPERTY_METADATA,
} from '@banhmi/common'
export class WsGatewayExplorer {
  explore(instance, gatewayClass) {
    const classMeta = gatewayClass[Symbol.metadata]
    if (!classMeta) return null
    const gatewayMeta = classMeta[WS_GATEWAY_METADATA]
    if (!gatewayMeta) return null
    const messageMap = classMeta[WS_MESSAGE_METADATA] ?? {}
    const serverPropNames = classMeta[WS_SERVER_PROPERTY_METADATA] ?? []
    const messages = {}
    for (const [event, methodName] of Object.entries(messageMap)) {
      const fn = instance[methodName]
      if (typeof fn === 'function') {
        messages[event] = (ctx) => fn.call(instance, ctx)
      }
    }
    const lifecycle = {}
    if ('afterInit' in instance && typeof instance.afterInit === 'function') {
      lifecycle.onInit = (server) => instance.afterInit(server)
    }
    if (
      'handleConnection' in instance &&
      typeof instance.handleConnection === 'function'
    ) {
      lifecycle.onConnection = (ctx) => instance.handleConnection(ctx)
    }
    if (
      'handleDisconnect' in instance &&
      typeof instance.handleDisconnect === 'function'
    ) {
      lifecycle.onDisconnect = (ctx) => instance.handleDisconnect(ctx)
    }
    return { path: gatewayMeta.path, messages, lifecycle, serverPropNames }
  }
}
