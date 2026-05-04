export interface WsContext {
  readonly event: string
  readonly data: unknown
  send(data: string | ArrayBuffer | Uint8Array): number
  subscribe(topic: string): void
  unsubscribe(topic: string): void
  publish(topic: string, data: string): number
  close(code?: number, reason?: string): void
  readonly remoteAddress: string
}

export interface OnGatewayInit {
  afterInit(server: unknown): void
}

export interface OnGatewayConnection {
  handleConnection(ctx: WsContext): void
}

export interface OnGatewayDisconnect {
  handleDisconnect(ctx: WsContext): void
}
