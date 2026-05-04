import { describe, expect, test } from 'bun:test'
import {
  Injectable,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@banhmi/common'
import type {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsContext,
} from '@banhmi/common'
import { WsGatewayExplorer } from '../src/ws-gateway-explorer'

@WebSocketGateway({ path: '/chat' })
@Injectable()
class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: unknown

  afterInit(_server: unknown): void {}
  handleConnection(_ctx: WsContext): void {}
  handleDisconnect(_ctx: WsContext): void {}

  @SubscribeMessage('ping')
  handlePing(_ctx: WsContext): { pong: string } {
    return { pong: 'ok' }
  }

  @SubscribeMessage('echo')
  handleEcho(ctx: WsContext): unknown {
    return ctx.data
  }
}

describe('WsGatewayExplorer', () => {
  const explorer = new WsGatewayExplorer()
  const instance = new ChatGateway()
  const explored = explorer.explore(instance, ChatGateway)

  test('returns null for non-gateway class', () => {
    class Plain {}
    expect(explorer.explore(new Plain(), Plain)).toBeNull()
  })

  test('extracts gateway path', () => {
    expect(explored?.path).toBe('/chat')
  })

  test('extracts message handlers', () => {
    expect(Object.keys(explored?.messages ?? {})).toEqual(['ping', 'echo'])
  })

  test('extracts server property names', () => {
    expect(explored?.serverPropNames).toEqual(['server'])
  })

  test('detects lifecycle: onInit', () => {
    expect(explored?.lifecycle.onInit).toBeFunction()
  })

  test('detects lifecycle: onConnection', () => {
    expect(explored?.lifecycle.onConnection).toBeFunction()
  })

  test('detects lifecycle: onDisconnect', () => {
    expect(explored?.lifecycle.onDisconnect).toBeFunction()
  })
})
