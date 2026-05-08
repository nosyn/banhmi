import {
  WS_GATEWAY_METADATA,
  WS_MESSAGE_METADATA,
  WS_SERVER_PROPERTY_METADATA,
} from '../metadata-keys'

export interface WsGatewayOptions {
  path?: string
}

export interface WsGatewayMetadata {
  path: string
}

export function WebSocketGateway(options: WsGatewayOptions = {}) {
  return <T extends abstract new (...args: unknown[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void => {
    context.metadata[WS_GATEWAY_METADATA] = {
      path: options.path ?? '/ws',
    } satisfies WsGatewayMetadata
  }
}

export function SubscribeMessage(event: string) {
  return (_target: unknown, context: ClassMethodDecoratorContext): void => {
    const existing =
      (context.metadata[WS_MESSAGE_METADATA] as
        | Record<string, string>
        | undefined) ?? {}
    context.metadata[WS_MESSAGE_METADATA] = {
      ...existing,
      [event]: context.name as string,
    }
  }
}

export function WebSocketServer() {
  return (_target: unknown, context: ClassFieldDecoratorContext): void => {
    const existing =
      (context.metadata[WS_SERVER_PROPERTY_METADATA] as string[] | undefined) ??
      []
    context.metadata[WS_SERVER_PROPERTY_METADATA] = [
      ...existing,
      context.name as string,
    ]
  }
}
