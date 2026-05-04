import type { WsContext } from '@banhmi/common'
import type { ServerWebSocket } from 'bun'

export interface BunWsData {
  sessionId: string
  gatewayPath: string
}

export class BunWsContext implements WsContext {
  constructor(
    private readonly ws: ServerWebSocket<BunWsData>,
    readonly event: string,
    readonly data: unknown,
  ) {}

  send(data: string | ArrayBuffer | Uint8Array): number {
    return this.ws.send(data)
  }

  subscribe(topic: string): void {
    this.ws.subscribe(topic)
  }

  unsubscribe(topic: string): void {
    this.ws.unsubscribe(topic)
  }

  publish(topic: string, data: string): number {
    return this.ws.publish(topic, data)
  }

  close(code?: number, reason?: string): void {
    this.ws.close(code, reason)
  }

  get remoteAddress(): string {
    return this.ws.remoteAddress
  }
}
