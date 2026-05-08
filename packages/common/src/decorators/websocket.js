import {
  WS_GATEWAY_METADATA,
  WS_MESSAGE_METADATA,
  WS_SERVER_PROPERTY_METADATA,
} from '../metadata-keys'
export function WebSocketGateway(options = {}) {
  return (_target, context) => {
    context.metadata[WS_GATEWAY_METADATA] = {
      path: options.path ?? '/ws',
    }
  }
}
export function SubscribeMessage(event) {
  return (_target, context) => {
    const existing = context.metadata[WS_MESSAGE_METADATA] ?? {}
    context.metadata[WS_MESSAGE_METADATA] = {
      ...existing,
      [event]: context.name,
    }
  }
}
export function WebSocketServer() {
  return (_target, context) => {
    const existing = context.metadata[WS_SERVER_PROPERTY_METADATA] ?? []
    context.metadata[WS_SERVER_PROPERTY_METADATA] = [...existing, context.name]
  }
}
