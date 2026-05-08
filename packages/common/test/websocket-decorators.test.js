import { describe, expect, test } from 'bun:test'
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '../src/decorators/websocket'
import {
  WS_GATEWAY_METADATA,
  WS_MESSAGE_METADATA,
  WS_SERVER_PROPERTY_METADATA,
} from '../src/metadata-keys'

describe('@WebSocketGateway', () => {
  test('stores gateway metadata with default path', () => {
    @WebSocketGateway()
    class TestGateway {}
    const meta = TestGateway[Symbol.metadata]
    expect(meta[WS_GATEWAY_METADATA]).toEqual({ path: '/ws' })
  })
  test('stores gateway metadata with custom path', () => {
    @WebSocketGateway({ path: '/chat' })
    class TestGateway {}
    const meta = TestGateway[Symbol.metadata]
    expect(meta[WS_GATEWAY_METADATA]).toEqual({ path: '/chat' })
  })
})
describe('@SubscribeMessage', () => {
  test('maps event names to method names', () => {
    class TestGateway {
      @SubscribeMessage('ping')
      handlePing() {}
      @SubscribeMessage('chat')
      handleChat() {}
    }
    const meta = TestGateway[Symbol.metadata]
    expect(meta[WS_MESSAGE_METADATA]).toEqual({
      ping: 'handlePing',
      chat: 'handleChat',
    })
  })
})
describe('@WebSocketServer', () => {
  test('stores property names in metadata', () => {
    class TestGateway {
      @WebSocketServer()
      server
    }
    const meta = TestGateway[Symbol.metadata]
    expect(meta[WS_SERVER_PROPERTY_METADATA]).toEqual(['server'])
  })
})
