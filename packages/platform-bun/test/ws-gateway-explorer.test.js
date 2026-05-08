import { describe, expect, test } from 'bun:test'
import {
  Injectable,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@banhmi/common'
import { WsGatewayExplorer } from '../src/ws-gateway-explorer'

@WebSocketGateway({ path: '/chat' })
@Injectable()
class ChatGateway {
  @WebSocketServer()
  server
  afterInit(_server) {}
  handleConnection(_ctx) {}
  handleDisconnect(_ctx) {}
  @SubscribeMessage('ping')
  handlePing(_ctx) {
    return { pong: 'ok' }
  }
  @SubscribeMessage('echo')
  handleEcho(ctx) {
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
