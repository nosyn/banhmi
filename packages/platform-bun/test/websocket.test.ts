import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { WsContext } from '@banhmi/common'
import {
  Injectable,
  Module,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import type { Server } from 'bun'
import { BanhmiFactory } from '../src/factory'

// ─── Gateway ─────────────────────────────────────────────────────────────────

@WebSocketGateway({ path: '/ws' })
@Injectable()
class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server

  readonly events: string[] = []

  afterInit(_server: unknown): void {
    this.events.push('init')
  }

  handleConnection(_ctx: WsContext): void {
    this.events.push('connected')
  }

  handleDisconnect(_ctx: WsContext): void {
    this.events.push('disconnected')
  }

  @SubscribeMessage('ping')
  handlePing(_ctx: WsContext): { pong: string } {
    return { pong: 'ok' }
  }

  @SubscribeMessage('echo')
  handleEcho(ctx: WsContext): unknown {
    return ctx.data
  }
}

// ─── Module ──────────────────────────────────────────────────────────────────

@Module({
  gateways: [ChatGateway],
  providers: [ChatGateway],
})
class WsAppModule {}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function wsConnect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.onopen = () => resolve(ws)
    ws.onerror = (e) => reject(e)
  })
}

function wsSend(
  ws: WebSocket,
  event: string,
  data: unknown,
): Promise<{ event: string; data: unknown }> {
  return new Promise((resolve) => {
    ws.onmessage = (e) =>
      resolve(JSON.parse(e.data as string) as { event: string; data: unknown })
    ws.send(JSON.stringify({ event, data }))
  })
}

function wsClose(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    ws.onclose = () => resolve()
    ws.close()
  })
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const PORT = 54323
const WS_URL = `ws://localhost:${PORT}/ws`

let app: BanhmiApplication
let gateway: ChatGateway

beforeAll(async () => {
  app = await BanhmiFactory.create(WsAppModule)
  await app.listen(PORT)
  gateway = app.container.resolve(ChatGateway) as ChatGateway
})

afterAll(async () => {
  await app.close()
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WebSocket gateway lifecycle', () => {
  test('afterInit is called with server after listen', () => {
    expect(gateway.events).toContain('init')
    expect(gateway.server).toBeDefined()
  })
})

describe('WebSocket connection', () => {
  test('ping returns pong', async () => {
    const ws = await wsConnect(WS_URL)
    const response = await wsSend(ws, 'ping', null)
    expect(response).toEqual({ event: 'ping', data: { pong: 'ok' } })
    await wsClose(ws)
  })

  test('echo returns the sent data', async () => {
    const ws = await wsConnect(WS_URL)
    const response = await wsSend(ws, 'echo', { hello: 'world' })
    expect(response).toEqual({ event: 'echo', data: { hello: 'world' } })
    await wsClose(ws)
  })

  test('unknown event gets no response (handler missing)', async () => {
    const ws = await wsConnect(WS_URL)
    let received = false
    ws.onmessage = () => {
      received = true
    }
    ws.send(JSON.stringify({ event: 'unknown', data: null }))
    // Wait briefly — no message should arrive
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(received).toBe(false)
    await wsClose(ws)
  })

  test('invalid JSON sends error response', async () => {
    const ws = await wsConnect(WS_URL)
    const response = await new Promise<{ error: string }>((resolve) => {
      ws.onmessage = (e) =>
        resolve(JSON.parse(e.data as string) as { error: string })
      ws.send('not json')
    })
    expect(response.error).toBe('Invalid JSON')
    await wsClose(ws)
  })

  test('handleConnection and handleDisconnect are called', async () => {
    const before = gateway.events.length
    const ws = await wsConnect(WS_URL)
    await wsClose(ws)
    // Wait for close to propagate
    await new Promise((resolve) => setTimeout(resolve, 50))
    const newEvents = gateway.events.slice(before)
    expect(newEvents).toContain('connected')
    expect(newEvents).toContain('disconnected')
  })
})

describe('HTTP still works alongside WebSockets', () => {
  test('HTTP 404 for unknown route', async () => {
    const res = await fetch(`http://localhost:${PORT}/unknown`)
    expect(res.status).toBe(404)
  })
})
